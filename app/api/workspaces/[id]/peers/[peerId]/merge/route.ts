import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const baseUrl = () => process.env.HONCHO_BASE_URL ?? "http://localhost:8000";
const authHeaders = (): Record<string, string> => {
  const key = process.env.HONCHO_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
};

async function honchoFetch(path: string, options: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Honcho ${res.status}: ${body}`);
  }
  return res;
}

type ConclusionItem = {
  id: string
  content: string
  observer_id: string
  observed_id: string
  session_id?: string | null
}

type Page<T> = { items: T[]; pages: number }

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string; peerId: string }> }
) {
  const { id: workspaceId, peerId: sourceId } = await params;
  const { targetPeerId } = await request.json() as { targetPeerId: string };

  if (!targetPeerId || targetPeerId === sourceId) {
    return NextResponse.json({ error: "Invalid target peer" }, { status: 400 });
  }

  let conclusionsMerged = 0;
  let sessionsMerged = 0;

  try {
    // ── 1. Collect all conclusions belonging to source peer ──────────────────
    const sourceConclusionsBatch: Omit<ConclusionItem, "id">[] = [];
    let page = 1;

    while (true) {
      const res = await honchoFetch(`/v3/workspaces/${workspaceId}/conclusions/list`, {
        method: "POST",
        body: JSON.stringify({ page, size: 50, reverse: false }),
      });
      const data = await res.json() as Page<ConclusionItem>;

      for (const c of data.items) {
        if (c.observer_id === sourceId || c.observed_id === sourceId) {
          sourceConclusionsBatch.push({
            content: c.content,
            observer_id: c.observer_id === sourceId ? targetPeerId : c.observer_id,
            observed_id: c.observed_id === sourceId ? targetPeerId : c.observed_id,
            session_id: c.session_id ?? null,
          });
        }
      }

      if (page >= data.pages) break;
      page++;
    }

    // ── 2. Batch-create remapped conclusions on target (max 100 per call) ────
    for (let i = 0; i < sourceConclusionsBatch.length; i += 100) {
      const batch = sourceConclusionsBatch.slice(i, i + 100);
      await honchoFetch(`/v3/workspaces/${workspaceId}/conclusions`, {
        method: "POST",
        body: JSON.stringify({ conclusions: batch }),
      });
      conclusionsMerged += batch.length;
    }

    // ── 3. Collect all sessions for source peer ──────────────────────────────
    const sessionIds: string[] = [];
    page = 1;

    while (true) {
      const res = await honchoFetch(
        `/v3/workspaces/${workspaceId}/peers/${sourceId}/sessions`,
        { method: "POST", body: JSON.stringify({ page, size: 50, reverse: false }) }
      );
      const data = await res.json() as Page<{ id: string }>;
      sessionIds.push(...data.items.map((s) => s.id));
      if (page >= data.pages) break;
      page++;
    }

    // ── 4. For each session: add target peer, remove source peer ─────────────
    for (const sessionId of sessionIds) {
      await honchoFetch(
        `/v3/workspaces/${workspaceId}/sessions/${sessionId}/peers`,
        { method: "POST", body: JSON.stringify({ [targetPeerId]: {} }) }
      );
      await honchoFetch(
        `/v3/workspaces/${workspaceId}/sessions/${sessionId}/peers`,
        { method: "DELETE", body: JSON.stringify([sourceId]) }
      );
      sessionsMerged++;
    }

    return NextResponse.json({ conclusionsMerged, sessionsMerged });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
