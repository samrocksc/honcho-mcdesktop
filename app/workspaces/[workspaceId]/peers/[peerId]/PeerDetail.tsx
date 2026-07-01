"use client";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Peer, RepresentationResponse, PeerContext, Session, Conclusion } from "@/lib/honcho/types";

type Props = {
  readonly peer: Peer | null
  readonly representation: RepresentationResponse | null
  readonly context: PeerContext | null
  readonly sessions: readonly Session[]
  readonly workspaceId: string
  readonly conclusions: readonly Conclusion[]
  readonly peerId: string
}

type Tab = "overview" | "inspect" | "conclusions"

const FONT_MONO = "ui-monospace, SFMono-Regular, \"SF Mono\", Menlo, Consolas, monospace";

export default function PeerDetail({ peer, representation, context, sessions, workspaceId, conclusions, peerId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [diagnosisConclusion, setDiagnosisConclusion] = useState<Conclusion | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const router = useRouter();

  const handleDeletePeer = async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/peers/${peerId}`, { method: "DELETE" });
    if (res.ok) router.push(`/workspaces/${workspaceId}`);
  };

  const tabs: { id: Tab; label: ReactNode }[] = [
    { id: "overview", label: "Overview" },
    { id: "inspect", label: "Inspect" },
    {
      id: "conclusions",
      label: (
        <>
          Conclusions
          <span className="badge badge-sm badge-neutral ml-2">{conclusions.length}</span>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2 flex-wrap">
        {confirmingDelete ? (
          <>
            <span className="text-sm text-base-content/70">Delete this peer?</span>
            <button className="btn btn-xs btn-error" onClick={handleDeletePeer}>
              Confirm delete
            </button>
            <button className="btn btn-xs btn-ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="btn btn-xs btn-ghost text-error" onClick={() => setConfirmingDelete(true)}>
            Delete peer
          </button>
        )}
        <button
          className="btn btn-sm btn-outline"
          onClick={() => setShowMerge((v) => !v)}
        >
          Merge into peer →
        </button>
        <Link
          href={`/workspaces/${workspaceId}/import?observed_id=${encodeURIComponent(peerId)}`}
          className="btn btn-sm btn-outline"
        >
          Re-import →
        </Link>
      </div>

      {showMerge && (
        <MergePanel
          workspaceId={workspaceId}
          sourcePeerId={peerId}
          onClose={() => setShowMerge(false)}
        />
      )}

      <div role="tablist" className="tabs tabs-bordered mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            className={`tab ${activeTab === t.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-0 relative">
        <div className="flex-1 min-w-0 space-y-4">
          {activeTab === "overview" && (
            <OverviewTab
              peer={peer}
              representation={representation}
              context={context}
              sessions={sessions}
              workspaceId={workspaceId}
            />
          )}
          {activeTab === "inspect" && (
            <InspectTab context={context} representation={representation} />
          )}
          {activeTab === "conclusions" && (
            <ConclusionsTab
              conclusions={conclusions}
              workspaceId={workspaceId}
              peerId={peerId}
              selectedId={diagnosisConclusion?.id ?? null}
              onSelect={setDiagnosisConclusion}
            />
          )}
        </div>
        {diagnosisConclusion && (
          <DiagnosePanel
            workspaceId={workspaceId}
            peerId={peerId}
            conclusion={diagnosisConclusion}
            onClose={() => setDiagnosisConclusion(null)}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ peer, representation, context, sessions, workspaceId }: {
  readonly peer: Peer | null
  readonly representation: RepresentationResponse | null
  readonly context: PeerContext | null
  readonly sessions: readonly Session[]
  readonly workspaceId: string
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2 space-y-4">
        {representation?.representation && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">Representation</h3>
              <div className="space-y-0.5">
                {representation.representation.split("\n").map((line, i) => {
                  const heading = line.match(/^#+\s+(.+)/);
                  if (heading) return (
                    <p key={i} className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mt-3 mb-1">{heading[1]}</p>
                  );
                  if (!line.trim()) return <div key={i} className="h-1" />;
                  return <p key={i} className="text-sm text-base-content/80 leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          </div>
        )}

        {context && (context.representation || context.peer_card) && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">Context</h3>
              {context.representation && (
                <p className="text-sm text-base-content/80 mb-2">{context.representation}</p>
              )}
              {context.peer_card && context.peer_card.length > 0 && (
                <ul className="list-disc list-inside text-sm text-base-content/70 space-y-1">
                  {context.peer_card.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {peer?.metadata && Object.keys(peer.metadata).length > 0 && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">Metadata</h3>
              <pre className="text-xs overflow-auto bg-base-200 rounded p-2">
                {JSON.stringify(peer.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {!representation && !context && !peer && (
          <p className="text-base-content/50 text-sm">No peer data available.</p>
        )}
      </div>

      <div className="lg:w-1/2">
        <h3 className="font-semibold mb-3">Sessions ({sessions.length})</h3>
        {sessions.length === 0
          ? <p className="text-base-content/50 text-sm">No sessions found.</p>
          : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link key={session.id} href={`/workspaces/${workspaceId}/sessions/${session.id}`} className="block">
                  <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow">
                    <div className="card-body py-3 px-4">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm font-medium">{session.id}</p>
                        {!session.is_active && <span className="badge badge-sm badge-ghost">inactive</span>}
                      </div>
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
      </div>
    </div>
  );
}

// ── Entry parsing ─────────────────────────────────────────────────────────────

type ParsedEntry = {
  timestamp: Date
  content: string
  ageDays: number
  bucket: "fresh" | "recent" | "aging" | "stale"
}

type ParsedSection = {
  heading: string | null
  entries: ParsedEntry[]
}

const ENTRY_RE = /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\]\s+(.+)$/;

function ageBucket(days: number): ParsedEntry["bucket"] {
  if (days < 7) return "fresh";
  if (days < 30) return "recent";
  if (days < 90) return "aging";
  return "stale";
}

function parseRepresentation(raw: string): ParsedSection[] {
  const now = Date.now();
  const lines = raw.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { heading: null, entries: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      if (current.entries.length > 0 || current.heading) sections.push(current);
      current = { heading: trimmed.replace(/^#+\s*/, ""), entries: [] };
      continue;
    }

    const m = ENTRY_RE.exec(trimmed);
    if (m) {
      const ts = new Date(m[1].replace(" ", "T"));
      const ageDays = Math.floor((now - ts.getTime()) / 86400000);
      current.entries.push({
        timestamp: ts,
        content: m[2],
        ageDays,
        bucket: ageBucket(ageDays),
      });
    }
  }

  if (current.entries.length > 0 || current.heading) sections.push(current);
  return sections;
}

// ── Colour scheme (mirrors stats page) ───────────────────────────────────────

const BUCKET_CONFIG = {
  fresh:  { label: "< 7d",   border: "#1a1a1a", bg: "transparent",        text: "#1a1a1a" },
  recent: { label: "7–30d",  border: "#595959", bg: "transparent",        text: "#595959" },
  aging:  { label: "30–90d", border: "#f59e0b", bg: "rgba(245,158,11,.06)", text: "#b45309" },
  stale:  { label: "> 90d",  border: "#d97706", bg: "rgba(217,119,6,.10)", text: "#92400e" },
} as const;

// ── Inspect tab ───────────────────────────────────────────────────────────────

function InspectTab({ context, representation }: {
  readonly context: PeerContext | null
  readonly representation: RepresentationResponse | null
}) {
  const raw = context?.representation ?? representation?.representation ?? null;

  if (!raw) {
    return <p className="text-base-content/50 text-sm">No context available to inspect.</p>;
  }

  const sections = parseRepresentation(raw);
  const allEntries = sections.flatMap((s) => s.entries);

  if (allEntries.length === 0) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <pre className="text-xs text-base-content/60 whitespace-pre-wrap" style={{ fontFamily: FONT_MONO }}>{raw}</pre>
        </div>
      </div>
    );
  }

  const counts = { fresh: 0, recent: 0, aging: 0, stale: 0 };
  for (const e of allEntries) counts[e.bucket]++;
  const total = allEntries.length;
  const charCount = raw.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="card bg-base-100 shadow">
        <div className="card-body py-4 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span style={{ fontFamily: FONT_MONO }}>{total} entries · {charCount.toLocaleString()} chars</span>
            {allEntries.length > 0 && (
              <span className="text-base-content/50" style={{ fontFamily: FONT_MONO }}>
                oldest: {Math.max(...allEntries.map((e) => e.ageDays))}d ago
              </span>
            )}
          </div>

          {/* Freshness bar */}
          <div className="space-y-1">
            <div className="flex gap-1 h-3 rounded overflow-hidden">
              {(["fresh", "recent", "aging", "stale"] as const).map((b) => {
                const w = total > 0 ? (counts[b] / total) * 100 : 0;
                if (w === 0) return null;
                return (
                  <div
                    key={b}
                    style={{ width: `${w}%`, background: BUCKET_CONFIG[b].border, flexShrink: 0 }}
                    title={`${BUCKET_CONFIG[b].label}: ${counts[b]}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(["fresh", "recent", "aging", "stale"] as const).map((b) => (
                <span
                  key={b}
                  className="flex items-center gap-1 text-xs"
                  style={{ fontFamily: FONT_MONO, color: "#737373" }}
                >
                  <span style={{ width: 8, height: 8, background: BUCKET_CONFIG[b].border, borderRadius: 2, display: "inline-block" }} />
                  {BUCKET_CONFIG[b].label} · {counts[b]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Entries by section */}
      {sections.map((section, si) => (
        <div key={si} className="card bg-base-100 shadow">
          <div className="card-body py-4 space-y-2">
            {section.heading && (
              <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
                {section.heading}
              </h3>
            )}
            {section.entries.length === 0 && (
              <p className="text-xs text-base-content/40" style={{ fontFamily: FONT_MONO }}>No entries</p>
            )}
            {section.entries.map((entry, ei) => {
              const cfg = BUCKET_CONFIG[entry.bucket];
              return (
                <div
                  key={ei}
                  style={{
                    borderLeft: `3px solid ${cfg.border}`,
                    background: cfg.bg,
                    borderRadius: "0 4px 4px 0",
                    padding: "6px 10px",
                  }}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className="text-xs shrink-0"
                      style={{ fontFamily: FONT_MONO, color: cfg.text, opacity: 0.7 }}
                    >
                      {entry.timestamp.toISOString().slice(0, 10)} · {entry.ageDays}d ago
                    </span>
                    <AgeBadge bucket={entry.bucket} />
                  </div>
                  <p className="text-sm mt-1 text-base-content/85" style={{ fontFamily: FONT_MONO }}>
                    {entry.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Diagnose panel ────────────────────────────────────────────────────────────

function DiagnosePanel({ workspaceId, peerId, conclusion, onClose }: {
  readonly workspaceId: string
  readonly peerId: string
  readonly conclusion: Conclusion
  readonly onClose: () => void
}) {
  const [query, setQuery] = useState(conclusion.content);
  const [reasoningLevel, setReasoningLevel] = useState<"low" | "medium" | "high">("low");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(conclusion.content);
    setResponse(null);
    setError("");
  }, [conclusion.id]);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/peers/${peerId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, reasoning_level: reasoningLevel }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json() as { content?: string };
      setResponse(data.content ?? "");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="border-l border-base-200 bg-base-50 flex flex-col flex-shrink-0"
      style={{ width: 320 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-200 flex-shrink-0">
        <span className="text-sm font-semibold">Diagnose</span>
        <button className="btn btn-xs btn-ghost" onClick={onClose}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Selected conclusion */}
        <div>
          <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO }}>
            Selected conclusion
          </p>
          <div className="rounded border border-primary/30 bg-primary/5 px-3 py-2">
            <p className="text-xs" style={{ fontFamily: FONT_MONO }}>{conclusion.content}</p>
          </div>
        </div>

        {/* Query */}
        <div>
          <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO }}>
            Query
          </p>
          <textarea
            className="textarea textarea-bordered text-sm w-full"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Reasoning level */}
        <div>
          <p className="text-xs text-base-content/50 uppercase tracking-wide mb-2" style={{ fontFamily: FONT_MONO }}>
            Reasoning level
          </p>
          <div className="join">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                className={`btn btn-xs join-item ${reasoningLevel === level ? "btn-neutral" : "btn-outline"}`}
                onClick={() => setReasoningLevel(level)}
                disabled={loading}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm w-full"
          onClick={handleAsk}
          disabled={loading || !query.trim()}
        >
          {loading ? <><span className="loading loading-spinner loading-xs" /> Asking…</> : "Ask"}
        </button>

        {error && <div className="alert alert-error text-xs"><span>{error}</span></div>}

        {response !== null && (
          <div>
            <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO }}>
              Response
            </p>
            <div className="rounded border border-base-300 bg-base-100 px-3 py-2">
              <p className="text-sm whitespace-pre-wrap">{response}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgeBadge({ bucket }: { readonly bucket: ParsedEntry["bucket"] }) {
  const cfg = BUCKET_CONFIG[bucket];
  if (bucket === "fresh") return null;
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{
        fontFamily: FONT_MONO,
        color: cfg.text,
        background: cfg.bg === "transparent" ? "rgba(0,0,0,0.05)" : cfg.bg,
        border: `1px solid ${cfg.border}`,
        opacity: 0.85,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Conclusions tab ───────────────────────────────────────────────────────────

function ConclusionsTab({
  conclusions: initialConclusions,
  workspaceId,
  peerId,
  selectedId,
  onSelect,
}: {
  readonly conclusions: readonly Conclusion[]
  readonly workspaceId: string
  readonly peerId: string
  readonly selectedId: string | null
  readonly onSelect: (c: Conclusion) => void
}) {
  const [conclusions, setConclusions] = useState<readonly Conclusion[]>(initialConclusions);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleCreate() {
    if (!newContent.trim() || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conclusions: [{ content: newContent.trim(), observer_id: peerId, observed_id: peerId }],
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const created = await res.json() as readonly Conclusion[];
      setConclusions((prev) => [...created, ...prev]);
      setNewContent("");
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setConclusions((prev) => prev.filter((c) => c.id !== id));
        setConfirming(null);
        setDeleteErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        const text = await res.text().catch(() => res.statusText);
        setDeleteErrors((prev) => ({ ...prev, [id]: text || `Error ${res.status}` }));
        setConfirming(null);
      }
    } catch (err) {
      setDeleteErrors((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : "Unknown error" }));
      setConfirming(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* New conclusion form */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-3 space-y-2">
          <textarea
            className="textarea textarea-bordered w-full text-sm min-h-16"
            placeholder="Add a conclusion about this peer..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate(); }}
            disabled={creating}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-base-content/40">⌘/Ctrl + Enter to save</span>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleCreate}
              disabled={creating || !newContent.trim()}
            >
              {creating ? <span className="loading loading-spinner loading-xs" /> : "Add"}
            </button>
          </div>
          {createError && <p className="text-xs text-error">{createError}</p>}
        </div>
      </div>

      {conclusions.length === 0 && <p className="text-base-content/50 text-sm">No conclusions yet.</p>}

      {conclusions.map((c) => (
        <div
          key={c.id}
          className={`card bg-base-100 shadow cursor-pointer transition-shadow ${selectedId === c.id ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => onSelect(c)}
        >
          <div className="card-body py-3 px-4 space-y-2">
            <p className="text-sm text-base-content/85 whitespace-pre-wrap">{c.content}</p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/50" style={{ fontFamily: FONT_MONO }}>
              <span>
                {c.observer_id === peerId ? (
                  <>observer: <span className="font-semibold text-base-content/70">self</span></>
                ) : (
                  <>observer: <span className="font-semibold text-base-content/70">{c.observer_id}</span></>
                )}
              </span>
              <span>·</span>
              <span>
                {c.observed_id === peerId ? (
                  <>about: <span className="font-semibold text-base-content/70">self</span></>
                ) : (
                  <>about: <span className="font-semibold text-base-content/70">{c.observed_id}</span></>
                )}
              </span>
              <span>·</span>
              <span>{new Date(c.created_at).toLocaleDateString()}</span>
              {c.session_id && (
                <>
                  <span>·</span>
                  <Link
                    href={`/workspaces/${workspaceId}/sessions/${c.session_id}`}
                    className="link link-hover text-base-content/50"
                  >
                    session
                  </Link>
                </>
              )}
            </div>

            {deleteErrors[c.id] && (
              <p className="text-xs text-error">{deleteErrors[c.id]}</p>
            )}

            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {confirming === c.id ? (
                <>
                  <button
                    className="btn btn-xs btn-error"
                    onClick={() => handleDelete(c.id)}
                  >
                    Confirm delete
                  </button>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-xs btn-ghost text-error"
                  onClick={() => setConfirming(c.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Merge panel ───────────────────────────────────────────────────────────────

type MergeResult = { conclusionsMerged: number; sessionsMerged: number }
type MergeState = "idle" | "loading-peers" | "ready" | "merging" | "done" | "error"

function MergePanel({ workspaceId, sourcePeerId, onClose }: {
  readonly workspaceId: string
  readonly sourcePeerId: string
  readonly onClose: () => void
}) {
  const [state, setState] = useState<MergeState>("loading-peers");
  const [peers, setPeers] = useState<readonly Peer[]>([]);
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/peers`)
      .then((r) => r.json())
      .then((data: { items?: Peer[] }) => {
        const others = (data.items ?? []).filter((p) => p.id !== sourcePeerId);
        setPeers(others);
        if (others[0]) setTargetId(others[0].id);
        setState("ready");
      })
      .catch((e: unknown) => { setError(String(e)); setState("error"); });
  }, [workspaceId, sourcePeerId]);

  const handleMerge = async () => {
    if (!targetId) return;
    setState("merging");
    setError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/peers/${sourcePeerId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPeerId: targetId }),
      });
      const data = await res.json() as MergeResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
      setState("done");
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Merge peer</h3>
          <button className="btn btn-xs btn-ghost" onClick={onClose}>✕</button>
        </div>

        {state === "loading-peers" && (
          <p className="text-sm text-base-content/50">Loading peers…</p>
        )}

        {(state === "ready" || state === "merging") && (
          <>
            <p className="text-sm text-base-content/70">
              Copies all conclusions from <strong className="font-mono">{sourcePeerId}</strong> to the target peer and reassigns all sessions. The source peer cannot be deleted afterward.
            </p>
            <label className="flex items-center gap-3 text-sm">
              <span className="font-medium shrink-0">Merge into:</span>
              <select
                className="select select-bordered select-sm flex-1"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={state === "merging"}
              >
                {peers.length === 0 && <option value="">No other peers</option>}
                {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={state === "merging"}>
                Cancel
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleMerge}
                disabled={state === "merging" || !targetId || peers.length === 0}
              >
                {state === "merging"
                  ? <><span className="loading loading-spinner loading-xs" /> Merging…</>
                  : "Merge"}
              </button>
            </div>
          </>
        )}

        {state === "done" && result && (
          <div className="space-y-2">
            <div className="alert alert-success text-sm">
              <span>
                Merged into <strong className="font-mono">{targetId}</strong>:
                {" "}{result.conclusionsMerged} conclusion{result.conclusionsMerged !== 1 ? "s" : ""},
                {" "}{result.sessionsMerged} session{result.sessionsMerged !== 1 ? "s" : ""}.
              </span>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-2">
            <div className="alert alert-error text-sm"><span>{error}</span></div>
            <div className="flex justify-end">
              <button className="btn btn-sm btn-ghost" onClick={() => setState("ready")}>Try again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
