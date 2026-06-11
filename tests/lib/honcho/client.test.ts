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
