# Honcho Helpdesk

A read-only dashboard for inspecting a self-hosted [Honcho](https://github.com/plastic-labs/honcho) instance. Browse workspaces, peers, sessions, messages, and conclusions — and query peer knowledge via chat or workspace search.

## Requirements

- Node.js 18+
- A running Honcho instance (self-hosted or remote)

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
HONCHO_BASE_URL=http://192.168.50.135:8000   # URL of your Honcho instance
HONCHO_API_KEY=                               # Optional — leave blank for unauthenticated instances
```

## Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What you can do

| Page | What it shows |
|---|---|
| `/` | All workspaces as clickable cards |
| `/workspaces/[id]` | Tabs: Peers · Sessions · Conclusions · Ask |
| `/workspaces/[id]/peers/[peerId]` | Peer representation, context, and sessions (responsive split) |
| `/workspaces/[id]/sessions/[sessionId]` | Full message thread |

### Ask tab

Inside any workspace, the **Ask** tab lets you query Honcho's knowledge:

- **Peer Chat** — select a peer and ask a question; the answer streams back from Honcho's agentic search over that peer's representation
- **Workspace Search** — semantic search across all messages in the workspace

## Architecture

Three-tier — each layer has one job:

```
Presentation   app/page.tsx, app/workspaces/**/page.tsx
               Server components call the data layer directly.
               Client components (WorkspaceTabs, AskPanel) call API routes.

Business       app/api/workspaces/**/route.ts
               Route handlers — proxy and orchestrate data layer calls.
               Consumed by client-side components only.

Data           lib/honcho/
               Typed HTTP client + one module per resource.
               Only layer that reads env vars or knows the Honcho URL.
```

## Regenerating types

Types are generated from the live Honcho OpenAPI spec:

```bash
npm run generate-types
```

Requires the server at `HONCHO_BASE_URL` to be reachable.

## Tests

```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # browser smoke tests (Playwright, requires dev server)
```
