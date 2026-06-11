import { describe, it, expect, vi, beforeEach } from 'vitest'
import { honchoPost, honchoGet } from '@/lib/honcho/client'
import { listWorkspaces, getWorkspace } from '@/lib/honcho/workspaces'
import type { Page, Workspace } from '@/lib/honcho/types'

vi.mock('@/lib/honcho/client', () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
}))

const mockPost = vi.mocked(honchoPost)
const mockGet = vi.mocked(honchoGet)

const workspace: Workspace = {
  id: 'ws-1', metadata: {}, created_at: '2026-01-01T00:00:00Z',
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
