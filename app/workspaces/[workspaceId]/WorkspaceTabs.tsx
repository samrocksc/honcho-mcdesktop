'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import type { Peer, Session, Conclusion } from '@/lib/honcho/types'

type Tab = 'peers' | 'sessions' | 'conclusions' | 'ask'
type AskMode = 'peer-chat' | 'workspace-search'

interface Props {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
  readonly sessions: readonly Session[]
  readonly conclusions: readonly Conclusion[]
}

export default function WorkspaceTabs({ workspaceId, peers, sessions, conclusions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('peers')

  return (
    <div>
      <div role="tablist" className="tabs tabs-bordered mb-6">
        {(['peers', 'sessions', 'conclusions', 'ask'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            className={`tab capitalize ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab !== 'ask' && (
              <span className="badge badge-sm badge-neutral ml-2">
                {tab === 'peers' ? peers.length : tab === 'sessions' ? sessions.length : conclusions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'peers' && <PeerList peers={peers} workspaceId={workspaceId} />}
      {activeTab === 'sessions' && <SessionList sessions={sessions} workspaceId={workspaceId} />}
      {activeTab === 'conclusions' && <ConclusionPanel conclusions={conclusions} workspaceId={workspaceId} />}
      {activeTab === 'ask' && <AskPanel workspaceId={workspaceId} peers={peers} />}
    </div>
  )
}

function PeerList({ peers, workspaceId }: { readonly peers: readonly Peer[]; readonly workspaceId: string }) {
  if (peers.length === 0) return <p className="text-base-content/50 text-sm">No peers found.</p>
  return (
    <div className="space-y-2">
      {peers.map((peer) => (
        <Link key={peer.id} href={`/workspaces/${workspaceId}/peers/${peer.id}`} className="block">
          <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow">
            <div className="card-body py-3 px-4">
              <p className="font-mono text-sm font-medium">{peer.id}</p>
              <p className="text-xs text-base-content/40">Created {new Date(peer.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function SessionList({ sessions, workspaceId }: { readonly sessions: readonly Session[]; readonly workspaceId: string }) {
  if (sessions.length === 0) return <p className="text-base-content/50 text-sm">No sessions found.</p>
  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Link key={session.id} href={`/workspaces/${workspaceId}/sessions/${session.id}`} className="block">
          <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow">
            <div className="card-body py-3 px-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-medium">{session.id}</p>
                {!session.is_active && <span className="badge badge-sm badge-ghost">inactive</span>}
              </div>
              <p className="text-xs text-base-content/40">Created {new Date(session.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function ConclusionPanel({ conclusions, workspaceId }: { readonly conclusions: readonly Conclusion[]; readonly workspaceId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly Conclusion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearchError('')
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      setResults(await res.json() as readonly Conclusion[])
    } catch (e) {
      setSearchError(String(e))
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
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
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
      {searchError && <div className="alert alert-error text-sm"><span>{searchError}</span></div>}
      {displayed.length === 0
        ? <p className="text-base-content/50 text-sm">No conclusions found.</p>
        : (
          <div className="space-y-2">
            {displayed.map((c) => (
              <div key={c.id} className="card bg-base-100 shadow-sm">
                <div className="card-body py-3 px-4">
                  <p className="text-sm">{c.content}</p>
                  <p className="text-xs text-base-content/40 font-mono">{c.observer_id} → {c.observed_id}</p>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

function AskPanel({ workspaceId, peers }: { readonly workspaceId: string; readonly peers: readonly Peer[] }) {
  const [mode, setMode] = useState<AskMode>('peer-chat')
  const [selectedPeerId, setSelectedPeerId] = useState(peers[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [searchResults, setSearchResults] = useState<readonly { id: string; content: string; peer_id?: string }[]>([])
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
        setSearchResults(await res.json() as readonly { id: string; content: string; peer_id?: string }[])
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} onModeChange={setMode} />

      {mode === 'peer-chat' && peers.length > 0 && (
        <PeerSelector peers={peers} value={selectedPeerId} onChange={setSelectedPeerId} />
      )}

      <div className="join w-full">
        <input
          className="input input-bordered join-item flex-1"
          placeholder={mode === 'peer-chat' ? 'Ask the peer a question...' : 'Search workspace messages...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
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
        <SearchResults results={searchResults} />
      )}
    </div>
  )
}

function ModeToggle({ mode, onModeChange }: { readonly mode: AskMode; readonly onModeChange: (m: AskMode) => void }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <span className="label text-sm font-medium">Mode:</span>
      <div className="join">
        <button
          className={`btn btn-sm join-item ${mode === 'peer-chat' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onModeChange('peer-chat')}
        >
          Peer Chat
        </button>
        <button
          className={`btn btn-sm join-item ${mode === 'workspace-search' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onModeChange('workspace-search')}
        >
          Workspace Search
        </button>
      </div>
    </div>
  )
}

function PeerSelector({ peers, value, onChange }: {
  readonly peers: readonly Peer[]
  readonly value: string
  readonly onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="label text-sm font-medium">Peer:</span>
      <select className="select select-bordered select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
      </select>
    </div>
  )
}

function SearchResults({ results }: { readonly results: readonly { id: string; content: string; peer_id?: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-base-content/60">{results.length} result(s)</p>
      {results.map((r) => (
        <div key={r.id} className="card bg-base-100 shadow-sm">
          <div className="card-body py-3 px-4">
            <p className="text-sm">{r.content}</p>
            {r.peer_id && <p className="text-xs text-base-content/40 font-mono">{r.peer_id}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
