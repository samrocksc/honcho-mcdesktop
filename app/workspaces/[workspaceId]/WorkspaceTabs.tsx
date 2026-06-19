"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import type { Peer, Session, Conclusion } from "@/lib/honcho/types";

type EditState = { type: "hidden" } | { type: "editing"; value: string; saving: boolean; error: string }

type Tab = "peers" | "sessions" | "conclusions" | "ask"
type AskMode = "peer-chat" | "workspace-search"

type Props = {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
  readonly sessions: readonly Session[]
  readonly conclusions: readonly Conclusion[]
}

export default function WorkspaceTabs({ workspaceId, peers, sessions, conclusions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("peers");

  return (
    <div>
      <div role="tablist" className="tabs tabs-bordered mb-6">
        {(["peers", "sessions", "conclusions", "ask"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            className={`tab capitalize ${activeTab === tab ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab !== "ask" && (
              <span className="badge badge-sm badge-neutral ml-2">
                {tab === "peers" ? peers.length : tab === "sessions" ? sessions.length : conclusions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "peers" && <PeerList peers={peers} workspaceId={workspaceId} />}
      {activeTab === "sessions" && <SessionList sessions={sessions} workspaceId={workspaceId} />}
      {activeTab === "conclusions" && <ConclusionPanel conclusions={conclusions} workspaceId={workspaceId} peers={peers} />}
      {activeTab === "ask" && <AskPanel workspaceId={workspaceId} peers={peers} />}
    </div>
  );
}

function PeerList({ peers: initialPeers, workspaceId }: { readonly peers: readonly Peer[]; readonly workspaceId: string }) {
  const [peers, setPeers] = useState(initialPeers);
  const [newRow, setNewRow] = useState<EditState>({ type: "hidden" });

  const handleCreate = async () => {
    if (newRow.type !== "editing" || !newRow.value.trim()) return;
    setNewRow({ ...newRow, saving: true, error: "" });
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/peers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer_id: newRow.value.trim() }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setNewRow({ ...newRow, saving: false, error: error ?? "Create failed" });
        return;
      }
      const peer = (await res.json()) as Peer;
      setPeers((prev) => [...prev.filter((p) => p.id !== peer.id), peer]);
      setNewRow({ type: "hidden" });
    } catch (e) {
      setNewRow({ ...newRow, saving: false, error: String(e) });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        {newRow.type === "hidden" && (
          <button
            className="btn btn-xs btn-outline"
            onClick={() => setNewRow({ type: "editing", value: "", saving: false, error: "" })}
          >
            + Add Peer
          </button>
        )}
      </div>

      {newRow.type === "editing" && (
        <div className="card bg-base-200/40 shadow-sm">
          <div className="card-body py-3 px-4 flex-row items-center gap-2 flex-wrap">
            <input
              autoFocus
              className="input input-bordered input-xs font-mono flex-1"
              placeholder="peer-id"
              value={newRow.value}
              onChange={(e) => setNewRow({ ...newRow, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setNewRow({ type: "hidden" });
              }}
              disabled={newRow.saving}
            />
            <button className="btn btn-xs btn-primary" onClick={handleCreate} disabled={newRow.saving || !newRow.value.trim()}>
              {newRow.saving ? <span className="loading loading-spinner loading-xs" /> : "Create"}
            </button>
            <button className="btn btn-xs btn-ghost" onClick={() => setNewRow({ type: "hidden" })} disabled={newRow.saving}>
              Cancel
            </button>
            {newRow.error && <p className="text-xs text-error w-full">{newRow.error}</p>}
          </div>
        </div>
      )}

      {peers.length === 0 && newRow.type === "hidden" && (
        <p className="text-base-content/50 text-sm">No peers found.</p>
      )}

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
  );
}

function SessionList({ sessions: initialSessions, workspaceId }: { readonly sessions: readonly Session[]; readonly workspaceId: string }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [newRow, setNewRow] = useState<EditState>({ type: "hidden" });
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    if (newRow.type !== "editing" || !newRow.value.trim()) return;
    setNewRow({ ...newRow, saving: true, error: "" });
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: newRow.value.trim() }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setNewRow({ ...newRow, saving: false, error: error ?? "Create failed" });
        return;
      }
      const session = (await res.json()) as Session;
      setSessions((prev) => [...prev.filter((s) => s.id !== session.id), session]);
      setNewRow({ type: "hidden" });
    } catch (e) {
      setNewRow({ ...newRow, saving: false, error: String(e) });
    }
  };

  const handleDelete = async (sessionId: string) => {
    setDeleteErrors((prev) => ({ ...prev, [sessionId]: "" }));
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setDeleteErrors((prev) => ({ ...prev, [sessionId]: error ?? "Delete failed" }));
        setConfirming(null);
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setConfirming(null);
    } catch (e) {
      setDeleteErrors((prev) => ({ ...prev, [sessionId]: String(e) }));
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        {newRow.type === "hidden" && (
          <button
            className="btn btn-xs btn-outline"
            onClick={() => setNewRow({ type: "editing", value: "", saving: false, error: "" })}
          >
            + Add Session
          </button>
        )}
      </div>

      {newRow.type === "editing" && (
        <div className="card bg-base-200/40 shadow-sm">
          <div className="card-body py-3 px-4 flex-row items-center gap-2 flex-wrap">
            <input
              autoFocus
              className="input input-bordered input-xs font-mono flex-1"
              placeholder="session-id"
              value={newRow.value}
              onChange={(e) => setNewRow({ ...newRow, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setNewRow({ type: "hidden" });
              }}
              disabled={newRow.saving}
            />
            <button className="btn btn-xs btn-primary" onClick={handleCreate} disabled={newRow.saving || !newRow.value.trim()}>
              {newRow.saving ? <span className="loading loading-spinner loading-xs" /> : "Create"}
            </button>
            <button className="btn btn-xs btn-ghost" onClick={() => setNewRow({ type: "hidden" })} disabled={newRow.saving}>
              Cancel
            </button>
            {newRow.error && <p className="text-xs text-error w-full">{newRow.error}</p>}
          </div>
        </div>
      )}

      {sessions.length === 0 && newRow.type === "hidden" && (
        <p className="text-base-content/50 text-sm">No sessions found.</p>
      )}

      {sessions.map((session) => (
        <div key={session.id} className={`card shadow-sm ${confirming === session.id ? "bg-error/5" : "bg-base-100"}`}>
          <div className="card-body py-3 px-4">
            {confirming === session.id ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-error">Delete session <span className="font-mono font-semibold">{session.id}</span> and all its messages?</p>
                {deleteErrors[session.id] && <p className="text-xs text-error">{deleteErrors[session.id]}</p>}
                <div className="flex gap-2">
                  <button className="btn btn-xs btn-error" onClick={() => handleDelete(session.id)}>Yes, delete</button>
                  <button className="btn btn-xs btn-ghost" onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/workspaces/${workspaceId}/sessions/${session.id}`} className="font-mono text-sm font-medium link link-hover">
                    {session.id}
                  </Link>
                  {!session.is_active && <span className="badge badge-sm badge-ghost ml-2">inactive</span>}
                  <p className="text-xs text-base-content/40">Created {new Date(session.created_at).toLocaleDateString()}</p>
                  {deleteErrors[session.id] && <p className="text-xs text-error mt-1">{deleteErrors[session.id]}</p>}
                </div>
                <button
                  className="btn btn-xs btn-ghost text-error"
                  onClick={() => setConfirming(session.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConclusionPanel({ conclusions: initialConclusions, workspaceId, peers }: { readonly conclusions: readonly Conclusion[]; readonly workspaceId: string; readonly peers: readonly Peer[] }) {
  // Honcho's /conclusions/query requires observer_id and observed_id peer
  // IDs. Both default to the first peer in the workspace; the user can
  // override either before searching. If a workspace has no peers the
  // search button stays disabled. (Tracked in tickets/0002.)
  const [conclusions, setConclusions] = useState(initialConclusions);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly Conclusion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [observerId, setObserverId] = useState(peers[0]?.id ?? "");
  const [observedId, setObservedId] = useState(peers[0]?.id ?? "");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const handleDelete = async (conclusionId: string) => {
    setDeleteErrors((prev) => ({ ...prev, [conclusionId]: "" }));
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions/${conclusionId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setDeleteErrors((prev) => ({ ...prev, [conclusionId]: error ?? "Delete failed" }));
        setConfirming(null);
        return;
      }
      setConclusions((prev) => prev.filter((c) => c.id !== conclusionId));
      if (results) setResults((prev) => prev?.filter((c) => c.id !== conclusionId) ?? null);
      setConfirming(null);
    } catch (e) {
      setDeleteErrors((prev) => ({ ...prev, [conclusionId]: String(e) }));
      setConfirming(null);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || !observerId || !observedId) return;
    setLoading(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, observer_id: observerId, observed_id: observedId, top_k: 10 }),
      });
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      setResults(await res.json() as readonly Conclusion[]);
    } catch (e) {
      setSearchError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const displayed = results ?? conclusions;

  return (
    <div className="space-y-4">
      {peers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Observer:</span>
            <select
              className="select select-bordered select-sm"
              value={observerId}
              onChange={(e) => setObserverId(e.target.value)}
            >
              {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Observed:</span>
            <select
              className="select select-bordered select-sm"
              value={observedId}
              onChange={(e) => setObservedId(e.target.value)}
            >
              {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <div className="alert alert-warning text-sm">
          <span>This workspace has no peers. Semantic search needs an observer and an observed peer.</span>
        </div>
      )}
      <div className="join w-full">
        <input
          className="input input-bordered join-item flex-1"
          placeholder="Semantic search conclusions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          disabled={loading || peers.length === 0}
        />
        <button className="btn join-item" onClick={handleSearch} disabled={loading || peers.length === 0}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : "Search"}
        </button>
        {results && (
          <button className="btn btn-ghost join-item" onClick={() => { setResults(null); setQuery(""); }}>
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
              <div key={c.id} className={`card shadow-sm ${confirming === c.id ? "bg-error/5" : "bg-base-100"}`}>
                <div className="card-body py-3 px-4">
                  {confirming === c.id ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-error">Delete this conclusion?</p>
                      {deleteErrors[c.id] && <p className="text-xs text-error">{deleteErrors[c.id]}</p>}
                      <div className="flex gap-2">
                        <button className="btn btn-xs btn-error" onClick={() => handleDelete(c.id)}>Yes, delete</button>
                        <button className="btn btn-xs btn-ghost" onClick={() => setConfirming(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm">{c.content}</p>
                        <p className="text-xs text-base-content/40 font-mono">{c.observer_id} → {c.observed_id}</p>
                        {deleteErrors[c.id] && <p className="text-xs text-error mt-1">{deleteErrors[c.id]}</p>}
                      </div>
                      <button
                        className="btn btn-xs btn-ghost text-error shrink-0"
                        onClick={() => setConfirming(c.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

function AskPanel({ workspaceId, peers }: { readonly workspaceId: string; readonly peers: readonly Peer[] }) {
  const [mode, setMode] = useState<AskMode>("peer-chat");
  const [selectedPeerId, setSelectedPeerId] = useState(peers[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [searchResults, setSearchResults] = useState<readonly { id: string; content: string; peer_id?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResponse("");
    setSearchResults([]);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      if (mode === "peer-chat") {
        const res = await fetch(`/api/workspaces/${workspaceId}/peers/${selectedPeerId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: abortRef.current.signal,
        });
        // Honcho's chat endpoint returns a single JSON envelope of the
        // shape {"content": "..."}, not a true chunked text stream. Read
        // the body as JSON and render the unwrapped field. (See
        // tickets/0001.) A future Honcho version that supports true SSE
        // streaming would replace this with a chunked reader.
        if (!res.ok) throw new Error("Chat request failed");
        const { content } = (await res.json()) as { content?: string };
        setResponse(content ?? "");
      } else {
        const res = await fetch(`/api/workspaces/${workspaceId}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error("Search request failed");
        setSearchResults(await res.json() as readonly { id: string; content: string; peer_id?: string }[]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} onModeChange={setMode} />

      {mode === "peer-chat" && peers.length > 0 && (
        <PeerSelector peers={peers} value={selectedPeerId} onChange={setSelectedPeerId} />
      )}

      <div className="join w-full">
        <input
          className="input input-bordered join-item flex-1"
          placeholder={mode === "peer-chat" ? "Ask the peer a question..." : "Search workspace messages..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          disabled={loading}
        />
        <button className="btn btn-primary join-item" onClick={handleSubmit} disabled={loading || !query.trim()}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : "Ask"}
        </button>
      </div>

      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

      {mode === "peer-chat" && response && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <p className="text-xs text-base-content/40 mb-1 font-mono">{selectedPeerId}</p>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
            {loading && <span className="loading loading-dots loading-sm mt-2" />}
          </div>
        </div>
      )}

      {mode === "workspace-search" && searchResults.length > 0 && (
        <SearchResults results={searchResults} />
      )}
    </div>
  );
}

function ModeToggle({ mode, onModeChange }: { readonly mode: AskMode; readonly onModeChange: (m: AskMode) => void }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <span className="label text-sm font-medium">Mode:</span>
      <div className="join">
        <button
          className={`btn btn-sm join-item ${mode === "peer-chat" ? "btn-primary" : "btn-outline"}`}
          onClick={() => onModeChange("peer-chat")}
        >
          Peer Chat
        </button>
        <button
          className={`btn btn-sm join-item ${mode === "workspace-search" ? "btn-primary" : "btn-outline"}`}
          onClick={() => onModeChange("workspace-search")}
        >
          Workspace Search
        </button>
      </div>
    </div>
  );
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
  );
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
  );
}
