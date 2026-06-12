# Workspace Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/workspaces/[id]/import` page that lets users upload markdown files, synthesise them into atomic conclusions via Honcho peer chat, and stream-write the results into a workspace with live per-conclusion status transitions (queued → writing → confirmed/error).

**Architecture:** Client-side markdown stripping → POST to Next.js API route → `askPeer` synthesis → `createConclusions` batch write → NDJSON stream back to client → React state drives CSS colour transitions on conclusion cards.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, DaisyUI + Tailwind, Honcho REST API (`/v3/workspaces/…`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/honcho/conclusions.ts` | Modify | Add `createConclusions()` batch writer |
| `lib/honcho/import.ts` | Create | `stripMarkdown`, `chunkByHeading`, `buildExtractionPrompt`, `parseConclusions` |
| `app/api/workspaces/[id]/import/route.ts` | Create | POST handler — synthesise + stream-write conclusions |
| `app/workspaces/[workspaceId]/import/page.tsx` | Create | Server component — fetch peers, render `ImportPanel` |
| `app/workspaces/[workspaceId]/import/ImportPanel.tsx` | Create | Client component — split-panel UI, streaming, card state |
| `app/workspaces/[workspaceId]/page.tsx` | Modify | Add "Import" link in workspace header |
| `tests/lib/honcho/conclusions.test.ts` | Modify | Add tests for `createConclusions` |
| `tests/lib/honcho/import.test.ts` | Create | Tests for all `lib/honcho/import.ts` exports |

---

## Stream Event Contract

The API route emits newline-delimited JSON. Every consumer must handle all four types:

```ts
type ImportEvent =
  | { type: "extracted"; content: string; filename: string }
  | { type: "writing";   filename: string; count: number }
  | { type: "batch_confirmed"; filename: string; count: number }
  | { type: "batch_error";     filename: string; error: string }
  | { type: "done"; total_files: number; total_conclusions: number; total_errors: number }
```

---

## Task 1: `createConclusions` — lib + test

**Files:**
- Modify: `lib/honcho/conclusions.ts`
- Modify: `tests/lib/honcho/conclusions.test.ts`

- [ ] **Step 1: Write the failing test**

Open `tests/lib/honcho/conclusions.test.ts` and add after the existing `describe` blocks:

```ts
describe("createConclusions", () => {
  beforeEach(() => mockPost.mockReset());

  it("POSTs to /v3/workspaces/{id}/conclusions with batch body", async () => {
    mockPost.mockResolvedValueOnce([conclusion]);
    await createConclusions("ws-1", [
      { content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2" },
    ]);
    expect(mockPost).toHaveBeenCalledWith(
      "/v3/workspaces/ws-1/conclusions",
      { conclusions: [{ content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2" }] },
    );
  });

  it("returns the created conclusions array", async () => {
    mockPost.mockResolvedValueOnce([conclusion]);
    const result = await createConclusions("ws-1", [
      { content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2" },
    ]);
    expect(result).toEqual([conclusion]);
  });
});
```

Update the import at the top to include `createConclusions`:
```ts
import { listConclusions, queryConclusions, createConclusions } from "@/lib/honcho/conclusions";
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/lib/honcho/conclusions.test.ts
```

Expected: FAIL — `createConclusions is not a function`

- [ ] **Step 3: Implement `createConclusions`**

Add to the bottom of `lib/honcho/conclusions.ts`:

```ts
type ConclusionCreateItem = {
  readonly content: string
  readonly observer_id: string
  readonly observed_id: string
  readonly session_id?: string | null
}

export const createConclusions = (
  workspaceId: string,
  conclusions: readonly ConclusionCreateItem[],
): Promise<readonly Conclusion[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions`, { conclusions });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose tests/lib/honcho/conclusions.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add lib/honcho/conclusions.ts tests/lib/honcho/conclusions.test.ts
git commit -m "feat: add createConclusions batch writer"
```

---

## Task 2: `lib/honcho/import.ts` — markdown helpers

**Files:**
- Create: `lib/honcho/import.ts`
- Create: `tests/lib/honcho/import.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/honcho/import.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  stripMarkdown,
  chunkByHeading,
  buildExtractionPrompt,
  parseConclusions,
} from "@/lib/honcho/import";

describe("stripMarkdown", () => {
  it("replaces [[wikilink]] with the link text", () => {
    expect(stripMarkdown("See [[MyPage]] for details.")).toBe("See MyPage for details.");
  });

  it("uses the display text when a pipe alias is present", () => {
    expect(stripMarkdown("See [[MyPage|My Page]] for details.")).toBe("See My Page for details.");
  });

  it("removes ![[embed]] entirely", () => {
    expect(stripMarkdown("Before ![[image.png]] after.")).toBe("Before  after.");
  });

  it("removes unchecked task lines", () => {
    expect(stripMarkdown("- [ ] Do the thing\nKeep this.")).toBe("Keep this.");
  });

  it("removes checked task lines", () => {
    expect(stripMarkdown("- [x] Done\nKeep this.")).toBe("Keep this.");
  });

  it("leaves normal content untouched", () => {
    expect(stripMarkdown("# Heading\n\nNormal paragraph.")).toBe("# Heading\n\nNormal paragraph.");
  });
});

describe("chunkByHeading", () => {
  it("returns the whole content as one chunk if under maxChars", () => {
    const content = "# Section\n\nSome text.";
    expect(chunkByHeading(content, 1000)).toEqual([content]);
  });

  it("splits on top-level headings when content exceeds maxChars", () => {
    const content = "# A\n\nshort\n# B\n\nshort";
    const chunks = chunkByHeading(content, 10);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain("# A");
    expect(chunks[1]).toContain("# B");
  });
});

describe("buildExtractionPrompt", () => {
  it("includes the guidance and content in the returned string", () => {
    const prompt = buildExtractionPrompt("some notes", "focus on tools");
    expect(prompt).toContain("focus on tools");
    expect(prompt).toContain("some notes");
    expect(prompt).toContain("JSON array");
  });
});

describe("parseConclusions", () => {
  it("parses a JSON array of strings", () => {
    const raw = '["User prefers X.", "User avoids Y."]';
    expect(parseConclusions(raw)).toEqual(["User prefers X.", "User avoids Y."]);
  });

  it("extracts a JSON array embedded in prose", () => {
    const raw = 'Here are the conclusions:\n["Conclusion A.", "Conclusion B."]\nDone.';
    expect(parseConclusions(raw)).toEqual(["Conclusion A.", "Conclusion B."]);
  });

  it("returns an empty array when no valid JSON array is found", () => {
    expect(parseConclusions("No conclusions here.")).toEqual([]);
  });

  it("returns an empty array when JSON is an object, not an array", () => {
    expect(parseConclusions('{"key": "value"}')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose tests/lib/honcho/import.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/honcho/import'`

- [ ] **Step 3: Implement `lib/honcho/import.ts`**

Create `lib/honcho/import.ts`:

```ts
export const stripMarkdown = (content: string): string =>
  content
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^- \[[ xX]\] .*/gm, "")
    .split("\n")
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();

const MAX_CHARS = 6000;

export const chunkByHeading = (content: string, maxChars = MAX_CHARS): string[] => {
  if (content.length <= maxChars) return [content];
  const sections = content.split(/(?=^# )/m).filter(Boolean);
  if (sections.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += maxChars) {
      chunks.push(content.slice(i, i + maxChars));
    }
    return chunks;
  }
  const chunks: string[] = [];
  let current = "";
  for (const section of sections) {
    if ((current + section).length > maxChars && current) {
      chunks.push(current.trim());
      current = section;
    } else {
      current += section;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const DEFAULT_GUIDANCE =
  "Extract atomic, persistent conclusions about engineering preferences, active projects, " +
  "tooling decisions, and recurring patterns. Ignore meeting logistics, tasks, and one-off notes.";

export const buildExtractionPrompt = (content: string, guidance: string): string => `
Extract conclusions from the following notes.

Rules:
- Return ONLY a JSON array of strings, nothing else — no prose, no markdown fences.
- Each string must be a single, atomic, declarative sentence in the present tense.
- Focus: ${guidance || DEFAULT_GUIDANCE}

Notes:
${content}
`.trim();

export const parseConclusions = (raw: string): string[] => {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose tests/lib/honcho/import.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add lib/honcho/import.ts tests/lib/honcho/import.test.ts
git commit -m "feat: add markdown import helpers (strip, chunk, prompt, parse)"
```

---

## Task 3: API route — streaming import handler

**Files:**
- Create: `app/api/workspaces/[id]/import/route.ts`

No unit tests for this route (it orchestrates network calls; integration testing is the right level). Verify manually in Task 6.

- [ ] **Step 1: Create the route**

Create `app/api/workspaces/[id]/import/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { askPeer } from "@/lib/honcho/peers";
import { createConclusions } from "@/lib/honcho/conclusions";
import { stripMarkdown, chunkByHeading, buildExtractionPrompt, parseConclusions } from "@/lib/honcho/import";

type ImportFile = {
  readonly name: string
  readonly content: string
}

type ImportBody = {
  readonly files: readonly ImportFile[]
  readonly observer_id: string
  readonly observed_id: string
  readonly guidance: string
}

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as ImportBody;
  const { files, observer_id, observed_id, guidance } = body;

  if (!Array.isArray(files) || typeof observer_id !== "string" || typeof observed_id !== "string") {
    return new Response(JSON.stringify({ error: "files, observer_id, and observed_id are required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      let totalConclusions = 0;
      let totalErrors = 0;

      for (const file of files) {
        try {
          const stripped = stripMarkdown(file.content);
          const chunks = chunkByHeading(stripped);
          const allConclusions: string[] = [];

          for (const chunk of chunks) {
            const prompt = buildExtractionPrompt(chunk, guidance);
            const response = await askPeer(id, observer_id, { query: prompt, reasoning_level: "low" });
            const parsed = parseConclusions(response.content ?? "");
            allConclusions.push(...parsed);
          }

          for (const content of allConclusions) {
            send({ type: "extracted", content, filename: file.name });
          }

          if (allConclusions.length === 0) {
            send({ type: "batch_error", filename: file.name, error: "No conclusions extracted" });
            totalErrors++;
            continue;
          }

          send({ type: "writing", filename: file.name, count: allConclusions.length });

          const items = allConclusions.map((content) => ({ content, observer_id, observed_id }));
          for (let i = 0; i < items.length; i += 100) {
            await createConclusions(id, items.slice(i, i + 100));
          }

          send({ type: "batch_confirmed", filename: file.name, count: allConclusions.length });
          totalConclusions += allConclusions.length;
        } catch (err) {
          send({ type: "batch_error", filename: file.name, error: String(err) });
          totalErrors++;
        }
      }

      send({ type: "done", total_files: files.length, total_conclusions: totalConclusions, total_errors: totalErrors });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "X-Content-Type-Options": "nosniff" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/workspaces/[id]/import/route.ts
git commit -m "feat: add import API route with NDJSON streaming"
```

---

## Task 4: Server page + `ImportPanel` client component

**Files:**
- Create: `app/workspaces/[workspaceId]/import/page.tsx`
- Create: `app/workspaces/[workspaceId]/import/ImportPanel.tsx`

- [ ] **Step 1: Create the server page**

Create `app/workspaces/[workspaceId]/import/page.tsx`:

```ts
import Link from "next/link";
import { listPeers } from "@/lib/honcho/peers";
import type { Peer } from "@/lib/honcho/types";
import ImportPanel from "./ImportPanel";

type Props = {
  readonly params: Promise<{ workspaceId: string }>
}

export default async function ImportPage({ params }: Props) {
  const { workspaceId } = await params;

  let peers: readonly Peer[] = [];
  try {
    const result = await listPeers(workspaceId);
    peers = result.items;
  } catch {}

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← Workspace</Link>
        <h1 className="text-xl font-bold font-mono truncate">{workspaceId}</h1>
        <span className="badge badge-neutral">Import</span>
      </div>
      <ImportPanel workspaceId={workspaceId} peers={peers} />
    </div>
  );
}
```

- [ ] **Step 2: Create `ImportPanel.tsx`**

Create `app/workspaces/[workspaceId]/import/ImportPanel.tsx`:

```tsx
"use client";
import { useState, useRef } from "react";
import type { Peer } from "@/lib/honcho/types";

type Props = {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
}

type CardState = "queued" | "writing" | "confirmed" | "error"

type ConclusionCard = {
  readonly id: string
  readonly content: string
  readonly filename: string
  state: CardState
  error?: string
}

type ImportFile = {
  readonly name: string
  readonly content: string
}

const DEFAULT_GUIDANCE =
  "Extract atomic, persistent conclusions about engineering preferences, active projects, " +
  "tooling decisions, and recurring patterns. Ignore meeting logistics, tasks, and one-off notes.";

function inferDate(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export default function ImportPanel({ workspaceId, peers }: Props) {
  const [observerId, setObserverId] = useState(peers[0]?.id ?? "");
  const [observedId, setObservedId] = useState(peers[0]?.id ?? "");
  const [guidance, setGuidance] = useState(DEFAULT_GUIDANCE);
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [cards, setCards] = useState<ConclusionCard[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noPeers = peers.length === 0;

  const handleFiles = (raw: FileList | null) => {
    if (!raw) return;
    const mdFiles = Array.from(raw).filter((f) => f.name.endsWith(".md"));
    Promise.all(mdFiles.map((f) => f.text().then((content) => ({ name: f.name, content }))))
      .then(setFiles);
  };

  const handleImport = async () => {
    if (!files.length || !observerId || !observedId || running) return;
    setRunning(true);
    setCards([]);
    setSummary(null);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, observer_id: observerId, observed_id: observedId, guidance }),
      });

      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let cardCounter = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as Record<string, unknown>;

            if (event.type === "extracted") {
              const id = String(cardCounter++);
              setCards((prev) => [
                ...prev,
                { id, content: String(event.content), filename: String(event.filename), state: "queued" },
              ]);
            } else if (event.type === "writing") {
              const filename = String(event.filename);
              setCards((prev) =>
                prev.map((c) => c.filename === filename && c.state === "queued" ? { ...c, state: "writing" } : c),
              );
            } else if (event.type === "batch_confirmed") {
              const filename = String(event.filename);
              setCards((prev) =>
                prev.map((c) => c.filename === filename && c.state === "writing" ? { ...c, state: "confirmed" } : c),
              );
            } else if (event.type === "batch_error") {
              const filename = String(event.filename);
              const errMsg = String(event.error);
              setCards((prev) =>
                prev.map((c) =>
                  c.filename === filename ? { ...c, state: "error", error: errMsg } : c,
                ),
              );
            } else if (event.type === "done") {
              setSummary(
                `${event.total_conclusions} conclusion${event.total_conclusions !== 1 ? "s" : ""} written` +
                ` from ${event.total_files} file${event.total_files !== 1 ? "s" : ""}` +
                (Number(event.total_errors) > 0 ? ` · ${event.total_errors} error(s)` : ""),
              );
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left panel — config */}
      <div className="lg:w-80 shrink-0 space-y-5">
        <div className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">About Workspace Hydration</h2>
            <p className="text-sm text-base-content/70">
              Upload markdown files — daily notes, knowledge docs, how-tos — and Honcho will
              extract structured conclusions and write them directly into this workspace.
            </p>
            <p className="text-sm text-base-content/70">
              A <strong>conclusion</strong> is a single, persistent fact about a peer — a preference,
              decision, or pattern Honcho can act on in future conversations.
            </p>
            <p className="text-sm text-base-content/70">
              The <strong>guidance prompt</strong> tells Honcho what to focus on. Edit it to change
              what gets extracted.
            </p>
          </div>
        </div>

        {noPeers ? (
          <div className="alert alert-warning text-sm">
            <span>This workspace has no peers. Create a peer before importing.</span>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="label text-sm font-medium">Observer peer</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={observerId}
                  onChange={(e) => setObserverId(e.target.value)}
                  disabled={running}
                >
                  {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="label text-sm font-medium">Observed peer</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={observedId}
                  onChange={(e) => setObservedId(e.target.value)}
                  disabled={running}
                >
                  {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="label text-sm font-medium">Guidance prompt</span>
              <textarea
                className="textarea textarea-bordered text-sm w-full"
                rows={5}
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                disabled={running}
              />
            </label>
          </>
        )}
      </div>

      {/* Right panel — files + results */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <p className="text-base-content/60 text-sm">
            Drop <code>.md</code> files here, or{" "}
            <span className="text-primary underline">browse for a folder</span>
          </p>
          <p className="text-xs text-base-content/40 mt-1">
            Drop = individual files · Browse = entire folder (all .md files inside)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            multiple
            // @ts-expect-error webkitdirectory not in React types
            webkitdirectory=""
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f) => {
              const date = inferDate(f.name);
              return (
                <div key={f.name} className="flex items-center justify-between text-sm px-3 py-2 bg-base-200 rounded">
                  <span className="font-mono truncate">{f.name}</span>
                  {date && <span className="text-xs text-base-content/40 ml-2 shrink-0">{date}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Hydrate button */}
        <button
          className="btn btn-primary w-full"
          onClick={handleImport}
          disabled={noPeers || !files.length || running}
        >
          {running
            ? <><span className="loading loading-spinner loading-sm" /> Hydrating…</>
            : `Hydrate Workspace (${files.length} file${files.length !== 1 ? "s" : ""})`}
        </button>

        {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

        {/* Summary */}
        {summary && (
          <div className="alert alert-success text-sm"><span>{summary}</span></div>
        )}

        {/* Conclusion cards */}
        {cards.length > 0 && (
          <div className="space-y-2">
            {cards.map((card) => (
              <ConclusionCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConclusionCard({ card }: { readonly card: ConclusionCard }) {
  const stateStyles: Record<CardState, string> = {
    queued:    "bg-base-100 border border-base-300 opacity-60",
    writing:   "bg-orange-50 border border-orange-200",
    confirmed: "bg-green-50 border border-green-200",
    error:     "bg-red-50 border border-red-200",
  };
  const labelStyles: Record<CardState, string> = {
    queued:    "text-base-content/30",
    writing:   "text-orange-400",
    confirmed: "text-green-500",
    error:     "text-red-400",
  };
  const labels: Record<CardState, string> = {
    queued:    "queued",
    writing:   "writing…",
    confirmed: "✓ written",
    error:     "error",
  };

  return (
    <div className={`rounded-lg px-4 py-3 transition-all duration-400 ${stateStyles[card.state]}`}>
      <p className="text-sm">{card.content}</p>
      <div className="flex items-center gap-2 mt-1">
        {card.state === "writing" && (
          <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        )}
        <span className={`text-xs font-mono ${labelStyles[card.state]}`}>
          {labels[card.state]}{card.state === "error" && card.error ? ` — ${card.error}` : ""}
        </span>
        <span className="text-xs text-base-content/30 font-mono">{card.filename}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/workspaces/[workspaceId]/import/page.tsx app/workspaces/[workspaceId]/import/ImportPanel.tsx
git commit -m "feat: add Import page — split panel UI with streaming conclusion cards"
```

---

## Task 5: Navigation link from workspace detail

**Files:**
- Modify: `app/workspaces/[workspaceId]/page.tsx`

- [ ] **Step 1: Add the Import link to the workspace header**

In `app/workspaces/[workspaceId]/page.tsx`, update the header `div` to include the import link:

```tsx
<div className="flex items-center gap-2 mb-6 flex-wrap">
  <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
  <h1 className="text-xl font-bold font-mono truncate">{workspaceId}</h1>
  <Link href={`/workspaces/${workspaceId}/import`} className="btn btn-sm btn-outline ml-auto">
    Import
  </Link>
</div>
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add app/workspaces/[workspaceId]/page.tsx
git commit -m "feat: add Import navigation link to workspace detail header"
```

---

## Task 6: Manual end-to-end verification

> Run the dev server and verify the golden path before calling this done.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to a workspace with at least one peer**

Open `http://localhost:3000`, pick any workspace with peers. Confirm the **Import** button appears in the header.

- [ ] **Step 3: Open the import page**

Confirm the split panel renders: left panel shows About text, peer selectors, and guidance prompt; right panel shows the drop zone.

- [ ] **Step 4: Upload a test markdown file**

Create a quick test file locally:

```bash
cat > /tmp/test-import.md << 'EOF'
# Engineering Notes — 2026-01-15

Prefer TypeScript strict mode in all new projects.

- [x] Set up linting
- [ ] Add tests

We use Honcho for persistent memory across AI agents.

![[diagram.png]]

See [[Architecture]] for the full design.
EOF
```

Drop `test-import.md` into the drop zone. Confirm:
- The file appears in the file list below the drop zone
- The date `2026-01-15` is extracted and shown beside the filename
- The Hydrate button becomes enabled

- [ ] **Step 5: Run the import**

Click **Hydrate Workspace**. Confirm:
- Button shows "Hydrating…" spinner
- Conclusion cards appear as they stream in (white/faded = queued)
- Cards turn amber with pulsing dot during the write phase
- Cards turn green with ✓ after write completes
- Summary line appears: "X conclusions written from 1 file"

- [ ] **Step 6: Verify conclusions appear in the workspace**

Navigate back to the workspace detail page → Conclusions tab. Confirm the imported conclusions are listed there.

- [ ] **Step 7: Test error path — no peers**

Create or navigate to a workspace with no peers. Open the import page. Confirm:
- Left panel shows the "no peers" warning
- Hydrate button is disabled

---

## Risk: `askPeer` as a synthesis engine

The `chat` endpoint (`POST /v3/workspaces/{id}/peers/{peerId}/chat`) is Honcho's dialectic interface, designed for Q&A about a peer's stored knowledge. Using it for freeform synthesis (passing raw markdown in the query) may produce unexpected results if Honcho's routing treats the query as a retrieval request rather than a generation prompt.

**If synthesis quality is poor:** Check whether the Honcho API has a dedicated completion or generation endpoint that bypasses peer knowledge retrieval. The `askPeer` call in the route (`Task 3`) is the single point to swap out.
