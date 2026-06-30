"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Message } from "@/lib/honcho/types";

type Tab = "messages" | "simulate"

type SessionContext = {
  id: string
  messages: Message[]
  summary?: { content: string } | null
  peer_representation?: string | null
  peer_card?: string[] | null
}

const FONT_MONO = "ui-monospace, SFMono-Regular, \"SF Mono\", Menlo, Consolas, monospace";

export default function SessionDetailPage() {
  const { workspaceId, sessionId } = useParams<{ workspaceId: string; sessionId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("messages");

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/sessions/${sessionId}/messages`)
      .then((r) => r.json())
      .then((data: { items?: Message[]; error?: string }) => {
        if (data.error) setLoadError(data.error);
        else setMessages(data.items ?? []);
      })
      .catch((e: unknown) => setLoadError(String(e)));
  }, [workspaceId, sessionId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← {workspaceId}</Link>
        <h1 className="text-lg font-bold font-mono truncate">{sessionId}</h1>
        {messages.length > 0 && <span className="badge badge-neutral">{messages.length} messages</span>}
      </div>

      {loadError && <div className="alert alert-error mb-4"><span>{loadError}</span></div>}

      <div role="tablist" className="tabs tabs-bordered mb-6">
        <button role="tab" className={`tab ${activeTab === "messages" ? "tab-active" : ""}`} onClick={() => setActiveTab("messages")}>
          Messages
        </button>
        <button role="tab" className={`tab ${activeTab === "simulate" ? "tab-active" : ""}`} onClick={() => setActiveTab("simulate")}>
          Simulate Context
        </button>
      </div>

      {activeTab === "messages" && <MessageThread messages={messages} />}
      {activeTab === "simulate" && (
        <SimulateContextPanel workspaceId={workspaceId} sessionId={sessionId} />
      )}
    </div>
  );
}

function MessageThread({ messages }: { readonly messages: readonly Message[] }) {
  if (messages.length === 0) {
    return <p className="text-base-content/50 text-sm">No messages in this session.</p>;
  }
  return (
    <div className="space-y-3">
      {messages.map((msg) => <MessageCard key={msg.id} message={msg} />)}
    </div>
  );
}

function MessageCard({ message }: { readonly message: Message }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body py-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="badge badge-outline badge-sm font-mono">{message.peer_id}</span>
          <span className="text-xs text-base-content/40">
            {new Date(message.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.token_count > 0 && (
          <p className="text-xs text-base-content/30 mt-1">{message.token_count} tokens</p>
        )}
      </div>
    </div>
  );
}

function SimulateContextPanel({ workspaceId, sessionId }: { workspaceId: string; sessionId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [peerTarget, setPeerTarget] = useState("");
  const [peerPerspective, setPeerPerspective] = useState("");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [result, setResult] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const qs = new URLSearchParams();
      if (searchQuery.trim()) qs.set("search_query", searchQuery.trim());
      if (peerTarget.trim()) qs.set("peer_target", peerTarget.trim());
      if (peerPerspective.trim()) qs.set("peer_perspective", peerPerspective.trim());
      qs.set("summary", String(includeSummary));

      const res = await fetch(
        `/api/workspaces/${workspaceId}/sessions/${sessionId}/context?${qs.toString()}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json() as SessionContext);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Caveat banner */}
      <div className="alert alert-warning text-sm">
        <span>
          This is a <strong>reconstruction</strong>, not a historical record. Honcho recomputes context on demand from current stored data — if conclusions have been added or removed since this session ran, the result may differ from what the agent actually received.
        </span>
      </div>

      {/* Controls */}
      <div className="card bg-base-100 shadow">
        <div className="card-body py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="form-control">
              <div className="label py-1"><span className="label-text text-xs">Search query <span className="opacity-50">(semantic retrieval)</span></span></div>
              <input
                className="input input-bordered input-sm"
                style={{ fontFamily: FONT_MONO }}
                placeholder="e.g. how do I reset a user's MFA?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleFetch(); }}
              />
            </label>
            <label className="form-control">
              <div className="label py-1"><span className="label-text text-xs">Peer target <span className="opacity-50">(whose context to fetch)</span></span></div>
              <input
                className="input input-bordered input-sm"
                style={{ fontFamily: FONT_MONO }}
                placeholder="e.g. sam"
                value={peerTarget}
                onChange={(e) => setPeerTarget(e.target.value)}
              />
            </label>
            <label className="form-control">
              <div className="label py-1"><span className="label-text text-xs">Peer perspective <span className="opacity-50">(observer's view)</span></span></div>
              <input
                className="input input-bordered input-sm"
                style={{ fontFamily: FONT_MONO }}
                placeholder="e.g. Hermes"
                value={peerPerspective}
                onChange={(e) => setPeerPerspective(e.target.value)}
              />
            </label>
            <label className="form-control">
              <div className="label py-1"><span className="label-text text-xs">Options</span></div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                />
                <span className="text-sm">Include session summary</span>
              </label>
            </label>
          </div>

          <button
            className="btn btn-sm btn-neutral w-fit"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : "Fetch context"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

      {result && <ContextResult result={result} />}
    </div>
  );
}

function ContextResult({ result }: { result: SessionContext }) {
  const charCount = [result.peer_representation, result.summary?.content]
    .filter(Boolean)
    .join("").length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 text-sm" style={{ fontFamily: FONT_MONO }}>
        <span>{result.messages.length} messages in session</span>
        {result.summary && <span className="text-base-content/60">· summary present</span>}
        {result.peer_representation && (
          <span className="text-base-content/60">· {charCount.toLocaleString()} chars of context</span>
        )}
      </div>

      {/* Summary */}
      {result.summary?.content && (
        <div className="card bg-base-100 shadow">
          <div className="card-body py-4">
            <h3 className="font-semibold text-sm mb-2">Session summary</h3>
            <p className="text-sm text-base-content/80 whitespace-pre-wrap" style={{ fontFamily: FONT_MONO }}>
              {result.summary.content}
            </p>
          </div>
        </div>
      )}

      {/* Peer representation (the actual includes) */}
      {result.peer_representation ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Peer representation <span className="text-base-content/40 font-normal">(what was injected as context)</span></h3>
              <span className="text-xs text-base-content/40" style={{ fontFamily: FONT_MONO }}>
                {result.peer_representation.length.toLocaleString()} chars
              </span>
            </div>
            <pre className="text-xs text-base-content/80 whitespace-pre-wrap overflow-auto bg-base-200 rounded p-3" style={{ fontFamily: FONT_MONO }}>
              {result.peer_representation}
            </pre>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="card-body py-4">
            <p className="text-sm text-base-content/50">
              No peer representation returned. Try setting a <strong>peer target</strong> and optionally a <strong>search query</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Peer card */}
      {result.peer_card && result.peer_card.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body py-4">
            <h3 className="font-semibold text-sm mb-2">Peer card</h3>
            <ul className="space-y-1">
              {result.peer_card.map((item, i) => (
                <li key={i} className="text-sm text-base-content/80 flex gap-2">
                  <span className="text-base-content/30">·</span>
                  <span style={{ fontFamily: FONT_MONO }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
