# Architecture

## Three-tier layout

Each layer has one job.

**Presentation** lives in `app/page.tsx` and `app/workspaces/**/page.tsx`. Server components call the data layer directly. Client components such as WorkspaceTabs, AskPanel, and ImportPanel call API routes.

**Business logic** lives in `app/api/workspaces/**/route.ts` and `app/api/stats/**/route.ts`. Route handlers proxy and orchestrate data layer calls. They are consumed by client-side components only.

**Data access** lives in `lib/honcho/`. This is a typed HTTP client with one module per resource. It is the only layer that reads environment variables or knows the Honcho URL.

```
Presentation   app/page.tsx, app/workspaces/**/page.tsx
               Server components call the data layer directly.
               Client components (WorkspaceTabs, AskPanel, ImportPanel) call API routes.

Business       app/api/workspaces/**/route.ts, app/api/stats/**/route.ts
               Route handlers — proxy and orchestrate data layer calls.
               Consumed by client-side components only.

Data           lib/honcho/
               Typed HTTP client + one module per resource.
               Only layer that reads env vars or knows the Honcho URL.
```

## Key files

| Path | Purpose |
|---|---|
| `lib/honcho/client.ts` | Base HTTP methods (get, post, put, delete, stream) |
| `lib/honcho/workspaces.ts` | Workspace CRUD |
| `lib/honcho/peers.ts` | Peer CRUD + chat |
| `lib/honcho/sessions.ts` | Session CRUD |
| `lib/honcho/conclusions.ts` | Conclusion CRUD + search |
| `lib/honcho/analytics.ts` | Stats aggregation with in-process TTL cache |
| `lib/honcho/import.ts` | Markdown chunking and conclusion extraction helpers |
| `app/workspaces/[workspaceId]/WorkspaceTabs.tsx` | Tabbed workspace detail (client component) |
| `app/workspaces/[workspaceId]/import/ImportPanel.tsx` | Streaming import UI (client component) |

## Streaming

The peer chat and workspace import both stream NDJSON over a `ReadableStream`. The API route holds the stream open, writes JSON lines as events arrive from Honcho, and closes when done. The client reads with `getReader()` and updates state incrementally.

## Analytics cache

`lib/honcho/analytics.ts` maintains an in-process TTL memo cache (5-minute expiry) keyed by workspace ID. Concurrent callers for the same key share one in-flight promise. Errors are not cached so the next caller retries immediately.

## Type generation

`lib/honcho/generated-types.ts` is auto-generated from the live Honcho OpenAPI spec via `npm run generate-types`. Do not edit it by hand.
