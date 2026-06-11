import { describe, it, expect, vi, beforeEach } from 'vitest'
import { honchoPost } from '@/lib/honcho/client'
import { listConclusions, queryConclusions } from '@/lib/honcho/conclusions'
import type { Conclusion } from '@/lib/honcho/types'

vi.mock('@/lib/honcho/client', () => ({ honchoPost: vi.fn() }))

const mockPost = vi.mocked(honchoPost)
const conclusion: Conclusion = {
  id: 'c-1', content: 'User is an expert.', observer_id: 'peer-1', observed_id: 'peer-2', created_at: '2026-01-01T00:00:00Z'
}

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
