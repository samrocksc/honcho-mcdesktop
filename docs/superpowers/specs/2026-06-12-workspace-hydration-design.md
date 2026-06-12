---
title: Workspace Hydration — Import Markdown into Honcho
date: 2026-06-12
tags: [honcho, import, conclusions, workspace]
description: Design spec for the Workspace Hydration feature — a dedicated page that lets users upload markdown files and synthesize them into Honcho conclusions via peer chat.
---

## Overview

A dedicated import page (`/workspaces/[id]/import`) that lets users upload markdown files (Obsidian dailies, knowledge docs, how-tos, etc.), strip noise, synthesize conclusions via Honcho's peer chat endpoint, and stream-write them into a workspace — going from an empty workspace to a hydrated one in one flow.

---

## Goals

- Cold-start a Honcho workspace from existing documentation without waiting for conversational osmosis
- Give users control over what gets extracted via a guidance prompt
- Provide immediate visual feedback as conclusions are written
- Stay within the Honcho ecosystem — no third-party LLM calls

---

## Non-Goals

- Recurring/scheduled imports
- Non-markdown file formats
- Editing or deleting conclusions post-import (that's the existing Conclusions tab)

---

## Architecture

### New files

```
app/workspaces/[workspaceId]/import/
  page.tsx          ← server component; fetches peer list for the workspace
  ImportPanel.tsx   ← client component; split-panel UI, streaming, state

app/api/workspaces/[id]/import/
  route.ts          ← POST handler: synthesize via chat → stream conclusion writes

lib/honcho/
  conclusions.ts    ← add createConclusion()
  import.ts         ← strip markdown, chunk large files, orchestrate extraction
```

### Existing patterns followed

- Server component fetches data (peer list); passes to client component as props — same as `WorkspaceTabs`
- API routes proxy to Honcho via `lib/honcho/` helpers — same as all existing routes
- DaisyUI + Tailwind for all styling

---

## UI — Split Panel

### Left panel (config)

- **About this feature** — brief explanation: what hydration does, what conclusions are, what the guidance prompt controls. This is the "narrative" that helps users understand what they're doing.
- **Observer peer** — dropdown (required)
- **Observed peer** — dropdown (required, defaults to same as observer)
- **Guidance prompt** — textarea, pre-filled with a useful default:
  > "Extract atomic, persistent conclusions about engineering preferences, active projects, tooling decisions, and recurring patterns. Ignore meeting logistics, tasks, and one-off notes."
- Disabled state with warning if workspace has no peers

### Right panel (files + results)

- Drag-and-drop zone accepting `.md` files; also supports folder selection via `<input webkitdirectory>`
- File list: filename + inferred date (from `YYYY-MM-DD` filename pattern if present)
- **Hydrate Workspace** button (disabled until ≥1 file selected and peers chosen)
- Results area — streams in as conclusions are written:
  - **Queued** — white card, faded
  - **Writing** — amber border + pulsing dot
  - **Confirmed** — light green background, green border, ✓ label
  - **Error** — red border, error message inline
- Final summary line: `X conclusions written from Y files (Z errors)`

---

## Data Flow

```
1. User selects files (browser file picker, .md only)

2. Client strips markdown (in-browser, no server round-trip):
     [[wikilinks]]   → extract inner label text
     ![[embeds]]     → remove entirely
     - [ ] task      → remove line
     - [x] task      → remove line

3. Client infers date from filename (YYYY-MM-DD pattern) if present

4. POST /api/workspaces/[id]/import
   Body: { files: [{name, content, date}], observer_id, observed_id, guidance }

5. API route — per file, sequentially:
   a. Calls askPeer() with extraction prompt:
        "Extract conclusions from these notes as a JSON array of strings.
         Each item must be a single, atomic, declarative sentence.
         Focus: {guidance}
         Notes: {content}"
   b. Parses JSON array from chat response
   c. Streams each extracted conclusion to client (NDJSON) immediately
      → client renders card in "queued" state
   d. Calls createConclusions() with all conclusions from that file as one batch
        [{ content, observer_id, observed_id }]
        (batches of ≤100; no metadata field on the Honcho schema)
   e. Streams confirmation per conclusion
      → client transitions card to "confirmed" (green) or "error" (red)

6. Client reads stream with response.body.getReader()
   CSS transition: background-color 400ms ease on each card
```

---

## Chunking

Files exceeding ~6000 characters are split by top-level heading (`# ...`) before sending to chat. Each chunk is processed as a separate extraction call. Conclusions from all chunks are merged into the same result stream.

---

## lib/honcho additions

### `createConclusions` (conclusions.ts)

The Honcho API exposes a **batch** create endpoint (max 100 per call). No metadata field exists on `ConclusionCreate`.

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

All conclusions extracted from a single file are batched into one call. If a file produces >100 conclusions it is split across multiple batch calls.

### `import.ts` (new)

Exports:
- `stripMarkdown(content: string): string` — wikilinks, embeds, checkboxes
- `chunkByHeading(content: string, maxChars: number): string[]` — splits on `# ` headings
- `buildExtractionPrompt(content: string, guidance: string): string` — prompt template
- `parseConclusions(chatResponse: string): string[]` — JSON parse with fallback

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Chat returns malformed JSON | Skip file, stream error card, continue |
| `createConclusion` fails | Mark that conclusion red, continue rest |
| File too large | Auto-chunk by heading before sending |
| No peers in workspace | Left panel warning, import button disabled |
| Network failure mid-stream | Error banner, show partial results |

---

## Lessons Learned / FAQ

**Q: Why not push raw notes as session messages and let Deriver run?**
Deriver is async and gives no guidance prompt control. For a "hydrate now" UX, peer chat synthesis with direct conclusion writes is the right call. Deriver remains useful for ongoing conversational ingestion.

**Q: Can we store import metadata (filename, date) on conclusions?**
No — `ConclusionCreate` has no metadata field. The source filename is shown in the UI results panel during import but is not persisted to Honcho. If traceability matters later, a `session_id` could be used to group conclusions from a single import run.

**Q: What if the guidance prompt produces garbage conclusions?**
User can re-run with a different prompt. Conclusions are additive — no overwrite. A future improvement would be a dry-run preview mode before writing.
