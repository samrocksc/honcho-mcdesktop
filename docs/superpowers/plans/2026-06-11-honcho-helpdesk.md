# Honcho Helpdesk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Next.js 15 dashboard for a self-hosted Honcho instance, showing workspaces, peers, sessions, messages, and conclusions, with a peer chat / workspace search Q&A interface.

**Architecture:** Three-tier — Presentation (`app/` pages + components) → Business (`app/api/` route handlers + server-page orchestration) → Data (`lib/honcho/` HTTP client + domain modules). Config (base URL, optional API key) lives only in the data layer, read from env vars. **Key rule:** server components (page.tsx files) call the data layer directly — this avoids the absolute-URL requirement for same-server fetch calls. API routes exist exclusively for client components (AskPanel, ConclusionList) running in the browser.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, DaisyUI + Tailwind CSS, eslint-plugin-functional (lite), openapi-typescript (type generation), Vitest + Testing Library (unit), Playwright (E2E).

---

## File Map

```
.env.local                                          # HONCHO_BASE_URL, HONCHO_API_KEY
.env.example                                        # same keys, empty values
.gitignore                                          # includes .superpowers/

lib/honcho/
  client.ts                                         # fetch wrapper, env vars, optional auth
  types.ts                                          # re-exports from generated types
  workspaces.ts                                     # listWorkspaces(), getWorkspace()
  peers.ts                                          # listPeers(), getPeer(), getPeerRepresentation(), getPeerContext(), chatPeer()
  sessions.ts                                       # listSessions(), getSession(), listMessages()
  conclusions.ts                                    # listConclusions(), queryConclusions()
  search.ts                                         # searchWorkspace()

app/
  layout.tsx                                        # root layout, DaisyUI theme, nav
  page.tsx                                          # workspace overview grid
  globals.css
  workspaces/[workspaceId]/
    page.tsx                                        # workspace detail, tabs
    peers/[peerId]/page.tsx                         # peer detail, responsive split
    sessions/[sessionId]/page.tsx                   # session message thread
  api/workspaces/
    route.ts                                        # GET → listWorkspaces
    [id]/peers/route.ts                             # GET → listPeers
    [id]/peers/[peerId]/route.ts                    # GET → getPeer + getPeerRepresentation + getPeerContext
    [id]/peers/[peerId]/sessions/route.ts           # GET → listSessions (peer-scoped)
    [id]/peers/[peerId]/chat/route.ts               # POST → chatPeer (streaming)
    [id]/sessions/route.ts                          # GET → listSessions
    [id]/sessions/[sessionId]/messages/route.ts     # GET → listMessages
    [id]/conclusions/route.ts                       # GET → listConclusions, POST body {query} → queryConclusions
    [id]/search/route.ts                            # POST → searchWorkspace
  components/
    WorkspaceCard.tsx
    WorkspaceTabs.tsx
    PeerList.tsx
    PeerDetail.tsx
    SessionList.tsx
    SessionThread.tsx
    ConclusionList.tsx
    AskPanel.tsx
    Pagination.tsx

tests/
  lib/honcho/client.test.ts
  lib/honcho/workspaces.test.ts
  lib/honcho/peers.test.ts
  lib/honcho/sessions.test.ts
  lib/honcho/conclusions.test.ts
  lib/honcho/search.test.ts
  e2e/smoke.spec.ts

scripts/
  generate-types.sh                                 # runs openapi-typescript against HONCHO_BASE_URL
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `.env.example`

- [ ] **Scaffold Next.js app**

```bash
cd /Users/sam/GitHub/work/honcho-helpdesk
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes
```

Expected: Next.js project files created. `app/`, `public/`, `package.json`, `tsconfig.json` present.

- [ ] **Install DaisyUI and additional deps**

```bash
npm install daisyui@latest
npm install -D eslint-plugin-functional openapi-typescript
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Configure Tailwind to include DaisyUI**

Replace `tailwind.config.ts` content:

```ts
import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [daisyui],
  daisyui: {
    themes: ['light', 'dark'],
  },
}

export default config
```

- [ ] **Configure ESLint with functional-lite**

Replace `eslint.config.mjs`:

```js
import { FlatCompat } from '@eslint/eslintrc'
import functional from 'eslint-plugin-functional'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['lib/**/*.ts', 'scripts/**/*.ts'],
    plugins: { functional },
    rules: {
      ...functional.configs['lite'].rules,
    },
  },
  {
    files: ['app/**/*.tsx', 'app/**/*.ts'],
    plugins: { functional },
    rules: {
      'functional/prefer-readonly-type': 'warn',
      'functional/no-mixed-types': 'off',
    },
  },
]

export default eslintConfig
```

- [ ] **Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Add scripts to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"generate-types": "bash scripts/generate-types.sh"
```

- [ ] **Create .env.example**

```
HONCHO_BASE_URL=http://192.168.50.135:8000
HONCHO_API_KEY=
```

- [ ] **Create .env.local**

```
HONCHO_BASE_URL=http://192.168.50.135:8000
HONCHO_API_KEY=
```

- [ ] **Update .gitignore to include .superpowers/**

Append to `.gitignore`:

```
.superpowers/
.env.local
```

- [ ] **Create type generation script**

Create `scripts/generate-types.sh`:

```bash
#!/usr/bin/env bash
set -e
source .env.local 2>/dev/null || true
BASE_URL="${HONCHO_BASE_URL:-http://192.168.50.135:8000}"
echo "Generating types from $BASE_URL/openapi.json"
npx openapi-typescript "$BASE_URL/openapi.json" -o lib/honcho/generated-types.ts
echo "Done: lib/honcho/generated-types.ts"
```

```bash
chmod +x scripts/generate-types.sh
```

- [ ] **Verify build compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 with DaisyUI, ESLint functional, Vitest"
```

---

## Task 2: Generate OpenAPI Types + Data Layer Client

**Files:**
- Create: `lib/honcho/generated-types.ts` (generated)
- Create: `lib/honcho/types.ts`
- Create: `lib/honcho/client.ts`
- Create: `tests/lib/honcho/client.test.ts`

- [ ] **Generate types from live Honcho instance**

```bash
npm run generate-types
```

Expected: `lib/honcho/generated-types.ts` created with interfaces for `Workspace`, `Peer`, `Session`, `Message`, `Conclusion`, `Page`, etc.

If the server is unreachable, create `lib/honcho/generated-types.ts` manually with these minimal types:

```ts
export interface Workspace {
  readonly id: string
  readonly name: string
  readonly metadata: Record<string, unknown>
  readonly created_at: string
}

export interface Peer {
  readonly id: string
  readonly workspace_id: string
  readonly metadata: Record<string, unknown>
  readonly created_at: string
}

export interface Session {
  readonly id: string
  readonly workspace_id: string
  readonly metadata: Record<string, unknown>
  readonly created_at: string
}

export interface Message {
  readonly id: string
  readonly content: string
  readonly peer_id: string
  readonly session_id: string
  readonly metadata: Record<string, unknown>
  readonly created_at: string
  readonly token_count: number
}

export interface Conclusion {
  readonly id: string
  readonly content: string
  readonly workspace_id: string
  readonly created_at: string
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly size: number
  readonly pages: number
}

export interface PeerContext {
  readonly messages: readonly Message[]
  readonly summary: string | null
}

export interface RepresentationResponse {
  readonly content: string
}
```

- [ ] **Create `lib/honcho/types.ts`**

```ts
export type {
  Workspace,
  Peer,
  Session,
  Message,
  Conclusion,
  Page,
  PeerContext,
  RepresentationResponse,
} from './generated-types'
```

- [ ] **Write failing test for client**

Create `tests/lib/honcho/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the client module by mocking global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Must import after stubbing
const { honchoGet, honchoPost } = await import('@/lib/honcho/client')

describe('honchoGet', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.unstubAllEnvs()
    vi.stubEnv('HONCHO_BASE_URL', 'http://test-host:8000')
    vi.stubEnv('HONCHO_API_KEY', '')
  })

  it('calls the correct URL with no auth header when API key is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'ws-1' }),
    })
    await honchoGet('/v3/workspaces/ws-1')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-host:8000/v3/workspaces/ws-1',
      expect.objectContaining({ method: 'GET' })
    )
    const [, opts] = mockFetch.mock.calls[0]
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  it('includes Authorization header when API key is set', async () => {
    vi.stubEnv('HONCHO_API_KEY', 'secret-key')
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await honchoGet('/v3/workspaces/ws-1')
    const [, opts] = mockFetch.mock.calls[0]
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer secret-key')
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
    await expect(honchoGet('/v3/workspaces/missing')).rejects.toThrow('Honcho 404')
  })
})

describe('honchoPost', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubEnv('HONCHO_BASE_URL', 'http://test-host:8000')
    vi.stubEnv('HONCHO_API_KEY', '')
  })

  it('sends JSON body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
    await honchoPost('/v3/workspaces/list', { page: 1, size: 50 })
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ page: 1, size: 50 })
  })
})
```

- [ ] **Run test to verify it fails**

```bash
npm test tests/lib/honcho/client.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '@/lib/honcho/client'`

- [ ] **Create `lib/honcho/client.ts`**

```ts
const baseUrl = (): string =>
  process.env.HONCHO_BASE_URL ?? 'http://localhost:8000'

const authHeaders = (): Record<string, string> => {
  const key = process.env.HONCHO_API_KEY
  return key ? { Authorization: `Bearer ${key}` } : {}
}

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Honcho ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export const honchoGet = <T>(path: string): Promise<T> =>
  fetch(`${baseUrl()}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  }).then(handleResponse<T>)

export const honchoPost = <T>(path: string, body: unknown): Promise<T> =>
  fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(handleResponse<T>)

export const honchoPostStream = (path: string, body: unknown): Promise<Response> =>
  fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
```

- [ ] **Run test to verify it passes**

```bash
npm test tests/lib/honcho/client.test.ts 2>&1 | tail -10
```

Expected: PASS (3 tests)

- [ ] **Commit**

```bash
git add lib/honcho/client.ts lib/honcho/types.ts lib/honcho/generated-types.ts tests/lib/honcho/client.test.ts scripts/generate-types.sh
git commit -m "feat: data layer client with optional auth"
```

---

## Task 3: Data Layer — Workspaces + Peers

**Files:**
- Create: `lib/honcho/workspaces.ts`
- Create: `lib/honcho/peers.ts`
- Create: `tests/lib/honcho/workspaces.test.ts`
- Create: `tests/lib/honcho/peers.test.ts`

- [ ] **Write failing test for workspaces**

Create `tests/lib/honcho/workspaces.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/honcho/client', () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
}))

import { honchoPost, honchoGet } from '@/lib/honcho/client'
import { listWorkspaces, getWorkspace } from '@/lib/honcho/workspaces'
import type { Page, Workspace } from '@/lib/honcho/types'

const mockPost = vi.mocked(honchoPost)
const mockGet = vi.mocked(honchoGet)

const workspace: Workspace = {
  id: 'ws-1', name: 'test', metadata: {}, created_at: '2026-01-01T00:00:00Z',
}

describe('listWorkspaces', () => {
  beforeEach(() => { mockPost.mockReset() })

  it('calls POST /v3/workspaces/list with pagination', async () => {
    const page: Page<Workspace> = { items: [workspace], total: 1, page: 1, size: 50, pages: 1 }
    mockPost.mockResolvedValueOnce(page)
    const result = await listWorkspaces()
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/list', { page: 1, size: 50, reverse: false })
    expect(result.items).toHaveLength(1)
  })

  it('passes custom page params', async () => {
    mockPost.mockResolvedValueOnce({ items: [], total: 0, page: 2, size: 10, pages: 0 })
    await listWorkspaces({ page: 2, size: 10 })
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/list', { page: 2, size: 10, reverse: false })
  })
})

describe('getWorkspace', () => {
  beforeEach(() => { mockGet.mockReset() })

  it('calls GET /v3/workspaces/{id}', async () => {
    mockGet.mockResolvedValueOnce(workspace)
    const result = await getWorkspace('ws-1')
    expect(mockGet).toHaveBeenCalledWith('/v3/workspaces/ws-1')
    expect(result.id).toBe('ws-1')
  })
})
```

- [ ] **Run test to confirm failure**

```bash
npm test tests/lib/honcho/workspaces.test.ts 2>&1 | tail -5
```

Expected: FAIL — module not found

- [ ] **Create `lib/honcho/workspaces.ts`**

```ts
import { honchoGet, honchoPost } from './client'
import type { Page, Workspace } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listWorkspaces = (params: ListParams = {}): Promise<Page<Workspace>> =>
  honchoPost('/v3/workspaces/list', { page: params.page ?? 1, size: params.size ?? 50, reverse: false })

export const getWorkspace = (workspaceId: string): Promise<Workspace> =>
  honchoGet(`/v3/workspaces/${workspaceId}`)
```

- [ ] **Write failing test for peers**

Create `tests/lib/honcho/peers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/honcho/client', () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
  honchoPostStream: vi.fn(),
}))

import { honchoPost, honchoGet, honchoPostStream } from '@/lib/honcho/client'
import { listPeers, getPeer, getPeerRepresentation, getPeerContext, chatPeer } from '@/lib/honcho/peers'
import type { Page, Peer, RepresentationResponse } from '@/lib/honcho/types'

const mockPost = vi.mocked(honchoPost)
const mockGet = vi.mocked(honchoGet)
const mockStream = vi.mocked(honchoPostStream)

const peer: Peer = { id: 'peer-1', workspace_id: 'ws-1', metadata: {}, created_at: '2026-01-01T00:00:00Z' }

describe('listPeers', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/peers/list', async () => {
    const page: Page<Peer> = { items: [peer], total: 1, page: 1, size: 50, pages: 1 }
    mockPost.mockResolvedValueOnce(page)
    await listPeers('ws-1')
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/ws-1/peers/list', { page: 1, size: 50, reverse: false })
  })
})

describe('getPeer', () => {
  beforeEach(() => mockGet.mockReset())
  it('calls GET /v3/workspaces/{id}/peers/{peerId}', async () => {
    mockGet.mockResolvedValueOnce(peer)
    await getPeer('ws-1', 'peer-1')
    expect(mockGet).toHaveBeenCalledWith('/v3/workspaces/ws-1/peers/peer-1')
  })
})

describe('getPeerRepresentation', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/peers/{peerId}/representation', async () => {
    const rep: RepresentationResponse = { content: 'This peer likes brevity.' }
    mockPost.mockResolvedValueOnce(rep)
    const result = await getPeerRepresentation('ws-1', 'peer-1')
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/ws-1/peers/peer-1/representation', {})
    expect(result.content).toBe('This peer likes brevity.')
  })
})

describe('chatPeer', () => {
  beforeEach(() => mockStream.mockReset())
  it('calls POST stream for peer chat', async () => {
    const fakeResponse = { ok: true, body: null } as unknown as Response
    mockStream.mockResolvedValueOnce(fakeResponse)
    const result = await chatPeer('ws-1', 'peer-1', 'What do you know?')
    expect(mockStream).toHaveBeenCalledWith(
      '/v3/workspaces/ws-1/peers/peer-1/chat',
      { query: 'What do you know?' }
    )
    expect(result).toBe(fakeResponse)
  })
})
```

- [ ] **Run test to confirm failure**

```bash
npm test tests/lib/honcho/peers.test.ts 2>&1 | tail -5
```

Expected: FAIL — module not found

- [ ] **Create `lib/honcho/peers.ts`**

```ts
import { honchoGet, honchoPost, honchoPostStream } from './client'
import type { Page, Peer, PeerContext, RepresentationResponse } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listPeers = (workspaceId: string, params: ListParams = {}): Promise<Page<Peer>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  })

export const getPeer = (workspaceId: string, peerId: string): Promise<Peer> =>
  honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}`)

export const getPeerRepresentation = (workspaceId: string, peerId: string): Promise<RepresentationResponse> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/${peerId}/representation`, {})

export const getPeerContext = (workspaceId: string, peerId: string): Promise<PeerContext> =>
  honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}/context`)

export const chatPeer = (workspaceId: string, peerId: string, query: string): Promise<Response> =>
  honchoPostStream(`/v3/workspaces/${workspaceId}/peers/${peerId}/chat`, { query })
```

- [ ] **Run all data layer tests**

```bash
npm test tests/lib/honcho/ 2>&1 | tail -10
```

Expected: all PASS

- [ ] **Commit**

```bash
git add lib/honcho/workspaces.ts lib/honcho/peers.ts tests/lib/honcho/workspaces.test.ts tests/lib/honcho/peers.test.ts
git commit -m "feat: data layer workspaces and peers modules"
```

---

## Task 4: Data Layer — Sessions, Conclusions, Search

**Files:**
- Create: `lib/honcho/sessions.ts`
- Create: `lib/honcho/conclusions.ts`
- Create: `lib/honcho/search.ts`
- Create: `tests/lib/honcho/sessions.test.ts`
- Create: `tests/lib/honcho/conclusions.test.ts`
- Create: `tests/lib/honcho/search.test.ts`

- [ ] **Write failing tests for sessions**

Create `tests/lib/honcho/sessions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/honcho/client', () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
}))

import { honchoPost, honchoGet } from '@/lib/honcho/client'
import { listSessions, getSession, listMessages } from '@/lib/honcho/sessions'
import type { Page, Session, Message } from '@/lib/honcho/types'

const mockPost = vi.mocked(honchoPost)
const mockGet = vi.mocked(honchoGet)

const session: Session = { id: 'sess-1', workspace_id: 'ws-1', metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const message: Message = {
  id: 'msg-1', content: 'Hello', peer_id: 'peer-1', session_id: 'sess-1',
  metadata: {}, created_at: '2026-01-01T00:00:00Z', token_count: 5,
}

describe('listSessions', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/sessions/list', async () => {
    mockPost.mockResolvedValueOnce({ items: [session], total: 1, page: 1, size: 50, pages: 1 })
    await listSessions('ws-1')
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/ws-1/sessions/list', { page: 1, size: 50, reverse: false })
  })
})

describe('listMessages', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/sessions/{sessionId}/messages/list', async () => {
    mockPost.mockResolvedValueOnce({ items: [message], total: 1, page: 1, size: 50, pages: 1 })
    await listMessages('ws-1', 'sess-1')
    expect(mockPost).toHaveBeenCalledWith(
      '/v3/workspaces/ws-1/sessions/sess-1/messages/list',
      { page: 1, size: 50, reverse: false }
    )
  })
})

describe('getSession', () => {
  beforeEach(() => mockGet.mockReset())
  it('calls GET for a single session', async () => {
    mockGet.mockResolvedValueOnce(session)
    await getSession('ws-1', 'sess-1')
    expect(mockGet).toHaveBeenCalledWith('/v3/workspaces/ws-1/sessions/sess-1')
  })
})
```

- [ ] **Write failing tests for conclusions + search**

Create `tests/lib/honcho/conclusions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/honcho/client', () => ({ honchoPost: vi.fn() }))

import { honchoPost } from '@/lib/honcho/client'
import { listConclusions, queryConclusions } from '@/lib/honcho/conclusions'
import type { Conclusion } from '@/lib/honcho/types'

const mockPost = vi.mocked(honchoPost)
const conclusion: Conclusion = { id: 'c-1', content: 'User is an expert.', workspace_id: 'ws-1', created_at: '2026-01-01T00:00:00Z' }

describe('listConclusions', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/conclusions/list', async () => {
    mockPost.mockResolvedValueOnce({ items: [conclusion], total: 1, page: 1, size: 50, pages: 1 })
    await listConclusions('ws-1')
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/ws-1/conclusions/list', { page: 1, size: 50, reverse: false })
  })
})

describe('queryConclusions', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/conclusions/query', async () => {
    mockPost.mockResolvedValueOnce([conclusion])
    await queryConclusions('ws-1', 'expertise')
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/ws-1/conclusions/query', { query: 'expertise' })
  })
})
```

Create `tests/lib/honcho/search.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/honcho/client', () => ({ honchoPost: vi.fn() }))

import { honchoPost } from '@/lib/honcho/client'
import { searchWorkspace } from '@/lib/honcho/search'

const mockPost = vi.mocked(honchoPost)

describe('searchWorkspace', () => {
  beforeEach(() => mockPost.mockReset())
  it('calls POST /v3/workspaces/{id}/search', async () => {
    mockPost.mockResolvedValueOnce([{ id: 'msg-1', content: 'result' }])
    await searchWorkspace('ws-1', 'security tools')
    expect(mockPost).toHaveBeenCalledWith('/v3/workspaces/ws-1/search', { query: 'security tools' })
  })
})
```

- [ ] **Run tests to confirm failures**

```bash
npm test tests/lib/honcho/sessions.test.ts tests/lib/honcho/conclusions.test.ts tests/lib/honcho/search.test.ts 2>&1 | tail -5
```

Expected: FAIL — modules not found

- [ ] **Create `lib/honcho/sessions.ts`**

```ts
import { honchoGet, honchoPost } from './client'
import type { Page, Session, Message, PeerContext } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listSessions = (workspaceId: string, params: ListParams = {}): Promise<Page<Session>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/sessions/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  })

export const getSession = (workspaceId: string, sessionId: string): Promise<Session> =>
  honchoGet(`/v3/workspaces/${workspaceId}/sessions/${sessionId}`)

export const listMessages = (workspaceId: string, sessionId: string, params: ListParams = {}): Promise<Page<Message>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/sessions/${sessionId}/messages/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  })

export const getSessionContext = (workspaceId: string, sessionId: string): Promise<PeerContext> =>
  honchoGet(`/v3/workspaces/${workspaceId}/sessions/${sessionId}/context`)
```

- [ ] **Create `lib/honcho/conclusions.ts`**

```ts
import { honchoPost } from './client'
import type { Conclusion, Page } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listConclusions = (workspaceId: string, params: ListParams = {}): Promise<Page<Conclusion>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  })

export const queryConclusions = (workspaceId: string, query: string): Promise<readonly Conclusion[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions/query`, { query })
```

- [ ] **Create `lib/honcho/search.ts`**

```ts
import { honchoPost } from './client'
import type { Message } from './types'

export const searchWorkspace = (workspaceId: string, query: string): Promise<readonly Message[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/search`, { query })
```

- [ ] **Run all tests**

```bash
npm test 2>&1 | tail -10
```

Expected: all PASS

- [ ] **Commit**

```bash
git add lib/honcho/sessions.ts lib/honcho/conclusions.ts lib/honcho/search.ts tests/lib/honcho/
git commit -m "feat: data layer sessions, conclusions, search modules"
```

---

## Task 5: API Routes — Workspaces + Peers

**Files:**
- Create: `app/api/workspaces/route.ts`
- Create: `app/api/workspaces/[id]/peers/route.ts`
- Create: `app/api/workspaces/[id]/peers/[peerId]/route.ts`
- Create: `app/api/workspaces/[id]/peers/[peerId]/sessions/route.ts`
- Create: `app/api/workspaces/[id]/peers/[peerId]/chat/route.ts`

- [ ] **Create workspace list route**

Create `app/api/workspaces/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listWorkspaces } from '@/lib/honcho/workspaces'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listWorkspaces({ page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create peer list route**

Create `app/api/workspaces/[id]/peers/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listPeers } from '@/lib/honcho/peers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listPeers(id, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create peer detail route**

Create `app/api/workspaces/[id]/peers/[peerId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPeer, getPeerRepresentation, getPeerContext } from '@/lib/honcho/peers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; peerId: string }> }
) {
  const { id, peerId } = await params
  try {
    const [peer, representation, context] = await Promise.allSettled([
      getPeer(id, peerId),
      getPeerRepresentation(id, peerId),
      getPeerContext(id, peerId),
    ])
    return NextResponse.json({
      peer: peer.status === 'fulfilled' ? peer.value : null,
      representation: representation.status === 'fulfilled' ? representation.value : null,
      context: context.status === 'fulfilled' ? context.value : null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create peer sessions route**

Create `app/api/workspaces/[id]/peers/[peerId]/sessions/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listSessions } from '@/lib/honcho/sessions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; peerId: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listSessions(id, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create peer chat streaming route**

Create `app/api/workspaces/[id]/peers/[peerId]/chat/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { chatPeer } from '@/lib/honcho/peers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; peerId: string }> }
) {
  const { id, peerId } = await params
  const { query } = await request.json() as { query: string }
  try {
    const upstream = await chatPeer(id, peerId, query)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Verify build**

```bash
npm run build 2>&1 | grep -E 'error|Error' | head -10
```

Expected: no TypeScript errors

- [ ] **Commit**

```bash
git add app/api/workspaces/
git commit -m "feat: API routes for workspaces and peers"
```

---

## Task 6: API Routes — Sessions, Conclusions, Search

**Files:**
- Create: `app/api/workspaces/[id]/sessions/route.ts`
- Create: `app/api/workspaces/[id]/sessions/[sessionId]/messages/route.ts`
- Create: `app/api/workspaces/[id]/conclusions/route.ts`
- Create: `app/api/workspaces/[id]/search/route.ts`

- [ ] **Create sessions list route**

Create `app/api/workspaces/[id]/sessions/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listSessions } from '@/lib/honcho/sessions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listSessions(id, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create messages list route**

Create `app/api/workspaces/[id]/sessions/[sessionId]/messages/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listMessages } from '@/lib/honcho/sessions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listMessages(id, sessionId, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create conclusions route (list + semantic query)**

Create `app/api/workspaces/[id]/conclusions/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listConclusions, queryConclusions } from '@/lib/honcho/conclusions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listConclusions(id, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { query } = await request.json() as { query: string }
  try {
    const data = await queryConclusions(id, query)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Create workspace search route**

Create `app/api/workspaces/[id]/search/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { searchWorkspace } from '@/lib/honcho/search'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { query } = await request.json() as { query: string }
  try {
    const data = await searchWorkspace(id, query)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
```

- [ ] **Verify build**

```bash
npm run build 2>&1 | grep -E 'error|Error' | head -10
```

Expected: no errors

- [ ] **Commit**

```bash
git add app/api/workspaces/[id]/sessions app/api/workspaces/[id]/conclusions app/api/workspaces/[id]/search
git commit -m "feat: API routes for sessions, conclusions, and search"
```

---

## Task 7: Root Layout + Workspace Overview Page

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`
- Create: `app/components/WorkspaceCard.tsx`
- Create: `app/components/Pagination.tsx`

- [ ] **Update root layout with DaisyUI theme and nav**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Honcho Helpdesk',
  description: 'Read-only dashboard for self-hosted Honcho',
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-200">
        <nav className="navbar bg-base-100 shadow-sm px-4">
          <a href="/" className="btn btn-ghost text-xl font-bold">
            Honcho Helpdesk
          </a>
        </nav>
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Create WorkspaceCard component**

Create `app/components/WorkspaceCard.tsx`:

```tsx
import type { Workspace } from '@/lib/honcho/types'
import Link from 'next/link'

interface Props {
  readonly workspace: Workspace
}

export default function WorkspaceCard({ workspace }: Props) {
  return (
    <Link href={`/workspaces/${workspace.id}`}>
      <div className="card bg-base-100 shadow hover:shadow-md transition-shadow cursor-pointer">
        <div className="card-body">
          <h2 className="card-title text-base">{workspace.name || workspace.id}</h2>
          <p className="text-sm text-base-content/60 font-mono truncate">{workspace.id}</p>
          <p className="text-xs text-base-content/40">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Create Pagination component**

Create `app/components/Pagination.tsx`:

```tsx
interface Props {
  readonly page: number
  readonly pages: number
  readonly onPageChange: (page: number) => void
}

export default function Pagination({ page, pages, onPageChange }: Props) {
  if (pages <= 1) return null
  return (
    <div className="flex justify-center gap-2 mt-4">
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        ← Prev
      </button>
      <span className="btn btn-sm btn-ghost no-animation">
        {page} / {pages}
      </span>
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
      >
        Next →
      </button>
    </div>
  )
}
```

- [ ] **Update workspace overview page**

Replace `app/page.tsx`:

```tsx
import WorkspaceCard from '@/app/components/WorkspaceCard'
import { listWorkspaces } from '@/lib/honcho/workspaces'
import type { Workspace } from '@/lib/honcho/types'

export default async function HomePage() {
  let workspaces: readonly Workspace[] = []
  let total = 0
  let error: string | null = null

  try {
    const page = await listWorkspaces()
    workspaces = page.items
    total = page.total
  } catch (e) {
    error = String(e)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        {total > 0 && (
          <span className="badge badge-neutral">{total} total</span>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span>Could not connect to Honcho: {error}</span>
        </div>
      )}

      {!error && workspaces.length === 0 && (
        <div className="alert alert-info">
          <span>No workspaces found.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <WorkspaceCard key={ws.id} workspace={ws} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Start dev server and verify workspace overview renders**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | grep -i 'workspace\|honcho' | head -5
```

Expected: HTML containing "Honcho Helpdesk" or workspace content

- [ ] **Commit**

```bash
kill %1 2>/dev/null; git add app/layout.tsx app/globals.css app/page.tsx app/components/
git commit -m "feat: root layout and workspace overview page"
```

---

## Task 8: Workspace Detail Page (Tabs)

**Files:**
- Create: `app/workspaces/[workspaceId]/page.tsx`
- Create: `app/components/WorkspaceTabs.tsx`
- Create: `app/components/PeerList.tsx`
- Create: `app/components/SessionList.tsx`
- Create: `app/components/ConclusionList.tsx`

- [ ] **Create PeerList component**

Create `app/components/PeerList.tsx`:

```tsx
'use client'
import type { Peer } from '@/lib/honcho/types'
import Link from 'next/link'

interface Props {
  readonly peers: readonly Peer[]
  readonly workspaceId: string
}

export default function PeerList({ peers, workspaceId }: Props) {
  if (peers.length === 0) {
    return <p className="text-base-content/50 text-sm">No peers found.</p>
  }
  return (
    <div className="space-y-2">
      {peers.map((peer) => (
        <Link
          key={peer.id}
          href={`/workspaces/${workspaceId}/peers/${peer.id}`}
          className="block"
        >
          <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow">
            <div className="card-body py-3 px-4">
              <p className="font-mono text-sm font-medium">{peer.id}</p>
              <p className="text-xs text-base-content/40">
                Created {new Date(peer.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Create SessionList component**

Create `app/components/SessionList.tsx`:

```tsx
'use client'
import type { Session } from '@/lib/honcho/types'
import Link from 'next/link'

interface Props {
  readonly sessions: readonly Session[]
  readonly workspaceId: string
}

export default function SessionList({ sessions, workspaceId }: Props) {
  if (sessions.length === 0) {
    return <p className="text-base-content/50 text-sm">No sessions found.</p>
  }
  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/workspaces/${workspaceId}/sessions/${session.id}`}
          className="block"
        >
          <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow">
            <div className="card-body py-3 px-4">
              <p className="font-mono text-sm font-medium">{session.id}</p>
              <p className="text-xs text-base-content/40">
                Created {new Date(session.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Create ConclusionList component**

Create `app/components/ConclusionList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { Conclusion } from '@/lib/honcho/types'

interface Props {
  readonly conclusions: readonly Conclusion[]
  readonly workspaceId: string
}

export default function ConclusionList({ conclusions, workspaceId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly Conclusion[] | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json() as readonly Conclusion[]
      setResults(data)
    } finally {
      setLoading(false)
    }
  }

  const displayed = results ?? conclusions

  return (
    <div className="space-y-4">
      <div className="join w-full">
        <input
          className="input input-bordered join-item flex-1"
          placeholder="Semantic search conclusions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn join-item" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Search'}
        </button>
        {results && (
          <button className="btn btn-ghost join-item" onClick={() => { setResults(null); setQuery('') }}>
            Clear
          </button>
        )}
      </div>
      {displayed.length === 0 ? (
        <p className="text-base-content/50 text-sm">No conclusions found.</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((c) => (
            <div key={c.id} className="card bg-base-100 shadow-sm">
              <div className="card-body py-3 px-4">
                <p className="text-sm">{c.content}</p>
                <p className="text-xs text-base-content/40 font-mono">{c.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Create WorkspaceTabs component**

Create `app/components/WorkspaceTabs.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { Peer, Session, Conclusion } from '@/lib/honcho/types'
import PeerList from './PeerList'
import SessionList from './SessionList'
import ConclusionList from './ConclusionList'
import AskPanel from './AskPanel'

type Tab = 'peers' | 'sessions' | 'conclusions' | 'ask'

interface Props {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
  readonly sessions: readonly Session[]
  readonly conclusions: readonly Conclusion[]
}

export default function WorkspaceTabs({ workspaceId, peers, sessions, conclusions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('peers')

  const tabs: { readonly id: Tab; readonly label: string; readonly count?: number }[] = [
    { id: 'peers', label: 'Peers', count: peers.length },
    { id: 'sessions', label: 'Sessions', count: sessions.length },
    { id: 'conclusions', label: 'Conclusions', count: conclusions.length },
    { id: 'ask', label: 'Ask' },
  ]

  return (
    <div>
      <div role="tablist" className="tabs tabs-bordered mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="badge badge-sm badge-neutral ml-2">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'peers' && <PeerList peers={peers} workspaceId={workspaceId} />}
      {activeTab === 'sessions' && <SessionList sessions={sessions} workspaceId={workspaceId} />}
      {activeTab === 'conclusions' && <ConclusionList conclusions={conclusions} workspaceId={workspaceId} />}
      {activeTab === 'ask' && <AskPanel workspaceId={workspaceId} peers={peers} />}
    </div>
  )
}
```

- [ ] **Create AskPanel component** (stub — full impl in Task 9)

Create `app/components/AskPanel.tsx`:

```tsx
'use client'
import type { Peer } from '@/lib/honcho/types'

interface Props {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
}

export default function AskPanel({ workspaceId, peers }: Props) {
  return (
    <div className="text-base-content/50 text-sm p-4 text-center">
      Ask panel — coming in next task
    </div>
  )
}
```

- [ ] **Create workspace detail page**

Create `app/workspaces/[workspaceId]/page.tsx`:

```tsx
import WorkspaceTabs from '@/app/components/WorkspaceTabs'
import { listPeers } from '@/lib/honcho/peers'
import { listSessions } from '@/lib/honcho/sessions'
import { listConclusions } from '@/lib/honcho/conclusions'
import type { Peer, Session, Conclusion } from '@/lib/honcho/types'
import Link from 'next/link'

interface Props {
  readonly params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceDetailPage({ params }: Props) {
  const { workspaceId } = await params

  const [peersResult, sessionsResult, conclusionsResult] = await Promise.allSettled([
    listPeers(workspaceId),
    listSessions(workspaceId),
    listConclusions(workspaceId),
  ])

  const peers: readonly Peer[] = peersResult.status === 'fulfilled' ? peersResult.value.items : []
  const sessions: readonly Session[] = sessionsResult.status === 'fulfilled' ? sessionsResult.value.items : []
  const conclusions: readonly Conclusion[] = conclusionsResult.status === 'fulfilled' ? conclusionsResult.value.items : []

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <h1 className="text-xl font-bold font-mono truncate">{workspaceId}</h1>
      </div>
      <WorkspaceTabs
        workspaceId={workspaceId}
        peers={peers}
        sessions={sessions}
        conclusions={conclusions}
      />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/workspaces/ app/components/
git commit -m "feat: workspace detail page with tabs"
```

---

## Task 9: Ask Panel (Q&A with Streaming + Toggle)

**Files:**
- Modify: `app/components/AskPanel.tsx`

- [ ] **Replace AskPanel stub with full implementation**

Replace `app/components/AskPanel.tsx`:

```tsx
'use client'
import { useState, useRef } from 'react'
import type { Peer, Message } from '@/lib/honcho/types'

type Mode = 'peer-chat' | 'workspace-search'

interface SearchResult {
  readonly id: string
  readonly content: string
  readonly peer_id?: string
  readonly created_at?: string
}

interface Props {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
}

export default function AskPanel({ workspaceId, peers }: Props) {
  const [mode, setMode] = useState<Mode>('peer-chat')
  const [selectedPeerId, setSelectedPeerId] = useState(peers[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [searchResults, setSearchResults] = useState<readonly SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError('')
    setResponse('')
    setSearchResults([])
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      if (mode === 'peer-chat') {
        const res = await fetch(`/api/workspaces/${workspaceId}/peers/${selectedPeerId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: abortRef.current.signal,
        })
        if (!res.ok || !res.body) throw new Error('Chat request failed')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let done = false
        while (!done) {
          const { value, done: streamDone } = await reader.read()
          done = streamDone
          if (value) setResponse((prev) => prev + decoder.decode(value, { stream: !done }))
        }
      } else {
        const res = await fetch(`/api/workspaces/${workspaceId}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: abortRef.current.signal,
        })
        if (!res.ok) throw new Error('Search request failed')
        const data = await res.json() as readonly SearchResult[]
        setSearchResults(data)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="label text-sm font-medium pr-0">Mode:</label>
        <div className="join">
          <button
            className={`btn btn-sm join-item ${mode === 'peer-chat' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMode('peer-chat')}
          >
            Peer Chat
          </button>
          <button
            className={`btn btn-sm join-item ${mode === 'workspace-search' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMode('workspace-search')}
          >
            Workspace Search
          </button>
        </div>

        {mode === 'peer-chat' && peers.length > 0 && (
          <>
            <label className="label text-sm font-medium pr-0">Peer:</label>
            <select
              className="select select-bordered select-sm"
              value={selectedPeerId}
              onChange={(e) => setSelectedPeerId(e.target.value)}
            >
              {peers.map((p) => (
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="join w-full">
        <input
          className="input input-bordered join-item flex-1"
          placeholder={mode === 'peer-chat' ? 'Ask the peer a question...' : 'Search workspace messages...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={loading}
        />
        <button className="btn btn-primary join-item" onClick={handleSubmit} disabled={loading || !query.trim()}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Ask'}
        </button>
      </div>

      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

      {mode === 'peer-chat' && response && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <p className="text-xs text-base-content/40 mb-1 font-mono">{selectedPeerId}</p>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
            {loading && <span className="loading loading-dots loading-sm mt-2" />}
          </div>
        </div>
      )}

      {mode === 'workspace-search' && searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-base-content/60">{searchResults.length} result(s)</p>
          {searchResults.map((r) => (
            <div key={r.id} className="card bg-base-100 shadow-sm">
              <div className="card-body py-3 px-4">
                <p className="text-sm">{r.content}</p>
                {r.peer_id && <p className="text-xs text-base-content/40 font-mono">{r.peer_id}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'workspace-search' && !loading && searchResults.length === 0 && query && !error && (
        <p className="text-base-content/50 text-sm">No results.</p>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/components/AskPanel.tsx
git commit -m "feat: Ask panel with peer chat streaming and workspace search toggle"
```

---

## Task 10: Peer Detail Page (Responsive Split View)

**Files:**
- Create: `app/workspaces/[workspaceId]/peers/[peerId]/page.tsx`
- Create: `app/components/PeerDetail.tsx`

- [ ] **Create PeerDetail component**

Create `app/components/PeerDetail.tsx`:

```tsx
import type { Peer, PeerContext, RepresentationResponse, Session } from '@/lib/honcho/types'
import SessionList from './SessionList'
import Link from 'next/link'

interface Props {
  readonly peer: Peer | null
  readonly representation: RepresentationResponse | null
  readonly context: PeerContext | null
  readonly sessions: readonly Session[]
  readonly workspaceId: string
}

export default function PeerDetail({ peer, representation, context, sessions, workspaceId }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left panel: representation + conclusions */}
      <div className="lg:w-1/2 space-y-4">
        {representation?.content && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">Representation</h3>
              <p className="text-sm whitespace-pre-wrap text-base-content/80">{representation.content}</p>
            </div>
          </div>
        )}

        {context?.summary && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">Summary</h3>
              <p className="text-sm text-base-content/80">{context.summary}</p>
            </div>
          </div>
        )}

        {peer && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">Metadata</h3>
              <pre className="text-xs overflow-auto bg-base-200 rounded p-2">
                {JSON.stringify(peer.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: sessions */}
      <div className="lg:w-1/2">
        <h3 className="font-semibold mb-3">Sessions ({sessions.length})</h3>
        <SessionList sessions={sessions} workspaceId={workspaceId} />
      </div>
    </div>
  )
}
```

- [ ] **Create peer detail page**

Create `app/workspaces/[workspaceId]/peers/[peerId]/page.tsx`:

```tsx
import PeerDetail from '@/app/components/PeerDetail'
import { getPeer, getPeerRepresentation, getPeerContext } from '@/lib/honcho/peers'
import { listSessions } from '@/lib/honcho/sessions'
import type { Peer, PeerContext, RepresentationResponse, Session } from '@/lib/honcho/types'
import Link from 'next/link'

interface Props {
  readonly params: Promise<{ workspaceId: string; peerId: string }>
}

export default async function PeerDetailPage({ params }: Props) {
  const { workspaceId, peerId } = await params

  const [peerResult, repResult, contextResult, sessionsResult] = await Promise.allSettled([
    getPeer(workspaceId, peerId),
    getPeerRepresentation(workspaceId, peerId),
    getPeerContext(workspaceId, peerId),
    listSessions(workspaceId),
  ])

  const peer: Peer | null = peerResult.status === 'fulfilled' ? peerResult.value : null
  const representation: RepresentationResponse | null = repResult.status === 'fulfilled' ? repResult.value : null
  const context: PeerContext | null = contextResult.status === 'fulfilled' ? contextResult.value : null
  const sessions: readonly Session[] = sessionsResult.status === 'fulfilled' ? sessionsResult.value.items : []

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">
          ← {workspaceId}
        </Link>
        <h1 className="text-lg font-bold font-mono truncate">{peerId}</h1>
      </div>
      <PeerDetail
        peer={peer}
        representation={representation}
        context={context}
        sessions={sessions}
        workspaceId={workspaceId}
      />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/workspaces/[workspaceId]/peers/ app/components/PeerDetail.tsx
git commit -m "feat: peer detail page with responsive split view"
```

---

## Task 11: Session Detail Page (Message Thread)

**Files:**
- Create: `app/workspaces/[workspaceId]/sessions/[sessionId]/page.tsx`
- Create: `app/components/SessionThread.tsx`

- [ ] **Create SessionThread component**

Create `app/components/SessionThread.tsx`:

```tsx
import type { Message } from '@/lib/honcho/types'

interface Props {
  readonly messages: readonly Message[]
}

export default function SessionThread({ messages }: Props) {
  if (messages.length === 0) {
    return <p className="text-base-content/50 text-sm">No messages in this session.</p>
  }
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className="card bg-base-100 shadow-sm">
          <div className="card-body py-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="badge badge-outline badge-sm font-mono">{msg.peer_id}</span>
              <span className="text-xs text-base-content/40">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            {msg.token_count > 0 && (
              <p className="text-xs text-base-content/30 mt-1">{msg.token_count} tokens</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Create session detail page**

Create `app/workspaces/[workspaceId]/sessions/[sessionId]/page.tsx`:

```tsx
import SessionThread from '@/app/components/SessionThread'
import { listMessages } from '@/lib/honcho/sessions'
import type { Message } from '@/lib/honcho/types'
import Link from 'next/link'

interface Props {
  readonly params: Promise<{ workspaceId: string; sessionId: string }>
}

export default async function SessionDetailPage({ params }: Props) {
  const { workspaceId, sessionId } = await params

  let messages: readonly Message[] = []
  let error: string | null = null

  try {
    const page = await listMessages(workspaceId, sessionId)
    messages = page.items
  } catch (e) {
    error = String(e)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">
          ← {workspaceId}
        </Link>
        <h1 className="text-lg font-bold font-mono truncate">{sessionId}</h1>
        {messages.length > 0 && (
          <span className="badge badge-neutral">{messages.length} messages</span>
        )}
      </div>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      <SessionThread messages={messages} />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/workspaces/[workspaceId]/sessions/ app/components/SessionThread.tsx
git commit -m "feat: session detail page with message thread"
```

---

## Task 12: E2E Smoke Test with Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
```

- [ ] **Write E2E smoke tests**

Create `tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('home page loads and shows Honcho Helpdesk nav', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Honcho Helpdesk')).toBeVisible()
  await expect(page.getByText('Workspaces')).toBeVisible()
})

test('shows workspace cards or empty state when Honcho is reachable', async ({ page }) => {
  await page.goto('/')
  // Either workspace cards exist, or we see the empty/error state
  const hasCards = await page.locator('.card').count()
  const hasAlert = await page.locator('.alert').count()
  expect(hasCards + hasAlert).toBeGreaterThan(0)
})

test('workspace detail page renders tabs when navigating to a workspace', async ({ page }) => {
  await page.goto('/')
  const firstCard = page.locator('a[href^="/workspaces/"]').first()
  const cardCount = await firstCard.count()

  if (cardCount === 0) {
    test.skip()
    return
  }

  await firstCard.click()
  await expect(page.getByRole('tab', { name: /peers/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /sessions/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /ask/i })).toBeVisible()
})

test('Ask tab shows peer chat and workspace search toggle', async ({ page }) => {
  await page.goto('/')
  const firstWorkspaceLink = page.locator('a[href^="/workspaces/"]').first()
  if (await firstWorkspaceLink.count() === 0) { test.skip(); return }

  await firstWorkspaceLink.click()
  await page.getByRole('tab', { name: /ask/i }).click()
  await expect(page.getByText('Peer Chat')).toBeVisible()
  await expect(page.getByText('Workspace Search')).toBeVisible()
})
```

- [ ] **Run E2E tests**

```bash
npm run test:e2e 2>&1 | tail -20
```

Expected: all 4 tests pass (or skip if no Honcho data is present)

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: all unit tests pass

- [ ] **Final build check**

```bash
npm run build 2>&1 | tail -5
```

Expected: build completes successfully

- [ ] **Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test: Playwright E2E smoke tests"
```

---

## Done

All tasks complete when:
- `npm test` passes all unit tests
- `npm run test:e2e` passes all E2E smoke tests
- `npm run build` succeeds with no TypeScript errors
- The dashboard is navigable: workspaces → workspace detail (tabs) → peer detail (split) → session thread → Ask panel with streaming peer chat and workspace search toggle
