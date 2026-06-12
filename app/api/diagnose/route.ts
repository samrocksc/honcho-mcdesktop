import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import {
  getPeerCard,
  getPeerContext,
  getPeerRepresentation,
  askPeer,
  searchPeerMessages,
  listPeers,
  type ReasoningLevel,
} from "@/lib/honcho/peers";
import { listWorkspaces } from "@/lib/honcho/workspaces";

type DiagnoseBody = {
  readonly workspaceId?: string
  readonly observerId?: string
  readonly targetId?: string
  readonly query?: string
  readonly reasoning_level?: ReasoningLevel
  readonly searchLimit?: number
}

const VALID_LEVELS: readonly ReasoningLevel[] = ["minimal", "low", "medium", "high", "max"];

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  const body = (await request.json()) as DiagnoseBody;
  const {
    workspaceId,
    observerId,
    targetId,
    query,
    reasoning_level = "low",
    searchLimit = 5,
  } = body;

  if (!workspaceId || !observerId) {
    return NextResponse.json(
      { error: "workspaceId and observerId are required" },
      { status: 422 },
    );
  }
  if (!VALID_LEVELS.includes(reasoning_level)) {
    return NextResponse.json(
      { error: `reasoning_level must be one of: ${VALID_LEVELS.join(", ")}` },
      { status: 422 },
    );
  }
  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 422 },
    );
  }

  const [representationResult, contextResult, peerCardResult, searchResult] = await Promise.allSettled([
    getPeerRepresentation(workspaceId, observerId),
    getPeerContext(workspaceId, observerId),
    getPeerCard(workspaceId, observerId, targetId ?? undefined),
    searchPeerMessages(workspaceId, observerId, { query, limit: searchLimit }),
  ]);

  const answer = await askPeer(workspaceId, observerId, {
    query,
    target: targetId ?? null,
    reasoning_level,
    stream: false,
  }).catch((err: unknown) => ({ error: String(err) }));

  const profile = {
    representation:
      representationResult.status === "fulfilled"
        ? representationResult.value.representation ?? null
        : null,
    context:
      contextResult.status === "fulfilled" ? contextResult.value : null,
    peer_card:
      peerCardResult.status === "fulfilled" ? peerCardResult.value : null,
    errors: {
      representation:
        representationResult.status === "rejected"
          ? String(representationResult.reason)
          : null,
      context:
        contextResult.status === "rejected"
          ? String(contextResult.reason)
          : null,
      peer_card:
        peerCardResult.status === "rejected"
          ? String(peerCardResult.reason)
          : null,
    },
  };

  const search =
    searchResult.status === "fulfilled"
      ? { hits: searchResult.value }
      : { hits: [], error: String(searchResult.reason) };

  return NextResponse.json({
    profile,
    search,
    answer,
    meta: {
      workspaceId,
      observerId,
      targetId: targetId ?? null,
      reasoningLevel: reasoning_level,
      durationMs: Date.now() - t0,
    },
  });
}

export async function GET() {
  const workspacesResult = await listWorkspaces().catch((err: unknown) => ({ error: String(err) }));

  if ("error" in workspacesResult) {
    return NextResponse.json({ error: workspacesResult.error }, { status: 502 });
  }

  type WorkspacePeers = { readonly id: string; readonly peers: readonly { readonly id: string }[] };
  const peerEntries = await Promise.allSettled(
    workspacesResult.items.map((w) =>
      listPeers(w.id).then((page): WorkspacePeers => ({ id: w.id, peers: page.items }))
    )
  ).then((results) =>
    results
      .filter((r): r is PromiseFulfilledResult<WorkspacePeers> => r.status === "fulfilled")
      .map((r): [string, WorkspacePeers["peers"]] => [r.value.id, r.value.peers])
  );
  const peersByWorkspace = Object.fromEntries(peerEntries);

  return NextResponse.json({
    workspaces: workspacesResult.items,
    peers: peersByWorkspace,
  });
}
