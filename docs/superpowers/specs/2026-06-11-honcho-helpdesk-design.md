# Honcho Helpdesk — Design Spec
_2026-06-11_

## Goal

A read-only dashboard for a self-hosted Honcho instance. Allows inspection of workspaces, peers, sessions, messages, and conclusions, plus a Q&A interface that queries peer knowledge via peer chat or workspace search.

V2 will add write capabilities (create/edit/delete).

---

## Architecture

Three-tier, mapped to Next.js App Router:

| Tier | Location | Responsibility |
|---|---|---|
| Presentation | `app/` — pages + React components | UI only, no data fetching logic |
| Business | `app/api/` — Next.js route handlers | Orchestrate Honcho calls, shape responses |
| Data | `lib/honcho/` — client + domain modules | Raw Honcho HTTP calls, typed responses |

Config is read from environment variables at runtime. The data layer is the only place that knows about Honcho URLs or keys.

---

## Configuration

`.env.local`:
```
HONCHO_BASE_URL=http://192.168.50.135:8000
HONCHO_API_KEY=          # optional — self-hosted instances may not require auth
```

If `HONCHO_API_KEY` is empty or unset, requests are sent without an `Authorization` header.

Types are generated from the live OpenAPI spec at `$HONCHO_BASE_URL/openapi.json` using `openapi-typescript` at build time.

---

## Pages & Routing

```
/
  Workspace overview — responsive grid of workspace cards

/workspaces/[workspaceId]
  Workspace detail — tabbed layout:
    Peers       — paginated list, click → peer detail
    Sessions    — paginated list, click → session detail
    Conclusions — paginated list with semantic search input
    Ask         — Q&A interface (see below)

/workspaces/[workspaceId]/peers/[peerId]
  Peer detail — responsive split view:
    Left panel:  Representation + Peer Card + Conclusions
    Right panel: Sessions list, click → session detail
    (stacks vertically on mobile)

/workspaces/[workspaceId]/sessions/[sessionId]
  Session detail — chronological message thread
```

All list views use Honcho's `page`/`size` pagination (max 100 per page) with next/prev controls.

---

## Data Layer (`lib/honcho/`)

```
lib/honcho/
  client.ts         fetch wrapper — base URL, optional Bearer token, error handling
  workspaces.ts     listWorkspaces(), getWorkspace()
  peers.ts          listPeers(), getPeer(), getPeerRepresentation(), getPeerContext(), chatPeer()
  sessions.ts       listSessions(), getSession(), listMessages(), getSessionContext()
  conclusions.ts    listConclusions(), queryConclusions()
  search.ts         searchWorkspace()
```

- `client.ts` is the only file that reads env vars
- All functions return TypeScript types generated from the OpenAPI spec
- No business logic in the data layer — pure HTTP calls and typed responses

---

## API Routes (`app/api/`)

```
GET  /api/workspaces
GET  /api/workspaces/[id]/peers
GET  /api/workspaces/[id]/peers/[peerId]
GET  /api/workspaces/[id]/peers/[peerId]/sessions
GET  /api/workspaces/[id]/sessions
GET  /api/workspaces/[id]/sessions/[sessionId]/messages
GET  /api/workspaces/[id]/conclusions
POST /api/workspaces/[id]/peers/[peerId]/chat       streams response via ReadableStream
POST /api/workspaces/[id]/search
```

Route handlers call data layer functions only. No direct Honcho HTTP calls in route handlers.

---

## Q&A Feature (Ask Tab)

UI flow:
1. Peer selector dropdown — lists peers in the workspace
2. Query text input
3. Toggle: **Peer Chat** (default) / **Workspace Search**
4. Submit → response displayed below

**Peer Chat mode:** `POST /api/workspaces/[id]/peers/[peerId]/chat` → proxies to Honcho peer chat endpoint. Response streams progressively via `ReadableStream`.

**Workspace Search mode:** `POST /api/workspaces/[id]/search` → returns ranked message results in a list UI (no streaming).

---

## Tooling

| Tool | Purpose |
|---|---|
| Next.js 15, App Router, TypeScript strict | Framework |
| DaisyUI + Tailwind CSS | All UI components |
| eslint-plugin-functional (lite) | Immutability rules; relaxed config for React files (hooks + JSX exempt) |
| openapi-typescript | Generate types from `$HONCHO_BASE_URL/openapi.json` at build time |

`.superpowers/` is added to `.gitignore`.

---

## Out of Scope (V1)

- Write operations (create/edit/delete workspaces, peers, sessions, messages)
- Authentication UI (login/logout)
- Multi-instance support (single Honcho base URL per deployment)
- Webhooks management
