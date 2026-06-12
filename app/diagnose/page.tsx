"use client";
import { useState, useEffect, useRef } from "react";

type Peer = {
  readonly id: string
  readonly workspace_id?: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly created_at?: string
}

type Workspace = {
  readonly id: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly configuration?: Readonly<Record<string, unknown>>
  readonly created_at?: string
}

type PeerContext = {
  readonly peer_id?: string
  readonly target_id?: string
  readonly representation?: string | null
  readonly peer_card?: readonly string[] | null
}

type PeerCardResponse = {
  readonly peer_card?: readonly string[] | null
}

type PeerSearchHit = {
  readonly id: string
  readonly content: string
  readonly peer_id?: string
  readonly created_at?: string
  readonly session_id?: string
  readonly workspace_id?: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

type DiagnoseResponse = {
  readonly profile: {
    readonly representation: string | null
    readonly context: PeerContext | null
    readonly peer_card: PeerCardResponse | null
    readonly errors: {
      readonly representation: string | null
      readonly context: string | null
      readonly peer_card: string | null
    }
  }
  readonly search:
    | { readonly hits: readonly PeerSearchHit[] }
    | { readonly hits: readonly PeerSearchHit[]; readonly error: string }
  readonly answer: { readonly content: string | null } | { readonly error: string }
  readonly meta: {
    readonly workspaceId: string
    readonly observerId: string
    readonly targetId: string | null
    readonly reasoningLevel: string
    readonly durationMs: number
  }
}

type ReasoningLevel = "minimal" | "low" | "medium" | "high" | "max"

const REASONING_LEVELS: readonly { value: ReasoningLevel; label: string; help: string }[] = [
  { value: "minimal", label: "minimal", help: "fastest, shallowest" },
  { value: "low", label: "low", help: "Honcho default" },
  { value: "medium", label: "medium", help: "balanced" },
  { value: "high", label: "high", help: "more thorough" },
  { value: "max", label: "max", help: "slowest, most thorough" },
];

export default function DiagnosePage() {
  const [workspaces, setWorkspaces] = useState<readonly Workspace[]>([]);
  const [peersByWorkspace, setPeersByWorkspace] = useState<Record<string, readonly Peer[]>>({});
  const [workspaceId, setWorkspaceId] = useState("");
  const [observerId, setObserverId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [useDifferentTarget, setUseDifferentTarget] = useState(false);
  const [query, setQuery] = useState("");
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>("low");
  const [searchLimit, setSearchLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiagnoseResponse | null>(null);

  const cancelledRef = useRef(false);

  // Populate workspace + peer dropdowns on first mount.
  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      try {
        const res = await fetch("/api/diagnose");
        if (!res.ok) throw new Error(`bootstrap failed: ${res.status}`);
        const data = await res.json() as {
          workspaces: readonly Workspace[]
          peers: Record<string, readonly Peer[]>
        };
        if (cancelledRef.current) return;
        setWorkspaces(data.workspaces);
        setPeersByWorkspace(data.peers);
        if (data.workspaces[0]) {
          setWorkspaceId(data.workspaces[0].id);
        }
      } catch (e) {
        if (!cancelledRef.current) setError(String(e));
      }
    })();
    return () => { cancelledRef.current = true; };
  }, []);

  // When the workspace changes, default the observer to the first peer.
  useEffect(() => {
    const peers = peersByWorkspace[workspaceId] ?? [];
    if (peers[0]) setObserverId(peers[0].id);
    setTargetId("");
  }, [workspaceId, peersByWorkspace]);

  const peers = peersByWorkspace[workspaceId] ?? [];

  const handleSubmit = async () => {
    if (!query.trim() || !workspaceId || !observerId || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          observerId,
          targetId: useDifferentTarget && targetId ? targetId : undefined,
          query,
          reasoning_level: reasoningLevel,
          searchLimit,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json() as DiagnoseResponse);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Diagnose</h1>
        <p className="text-sm text-base-content/60 mt-1">
          Paste a question and see (1) the raw context Honcho would inject, (2) the answer
          Honcho&apos;s dialectic LLM would return. Use this to audit what an agent actually
          sees before relying on it.
        </p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="form-control w-full">
              <div className="label"><span className="label-text font-medium">Workspace</span></div>
              <select
                className="select select-bordered"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              >
                <option value="">— select —</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
              </select>
            </label>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Observer (who is asking)</span>
              </div>
              <select
                className="select select-bordered"
                value={observerId}
                onChange={(e) => setObserverId(e.target.value)}
                disabled={!workspaceId}
              >
                {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </label>
          </div>

          <label className="cursor-pointer flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={useDifferentTarget}
              onChange={(e) => setUseDifferentTarget(e.target.checked)}
            />
            <span>Ask from the perspective of a different peer (target)</span>
          </label>
          {useDifferentTarget && (
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Target peer</span>
              </div>
              <select
                className="select select-bordered"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={!workspaceId}
              >
                <option value="">— select —</option>
                {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </label>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Reasoning level</span>
              </div>
              <div className="join">
                {REASONING_LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    title={l.help}
                    className={`btn btn-sm join-item ${reasoningLevel === l.value ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setReasoningLevel(l.value)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </label>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Search limit (peer message recall)</span>
              </div>
              <input
                type="number"
                min={1}
                max={50}
                className="input input-bordered"
                value={searchLimit}
                onChange={(e) => setSearchLimit(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
              />
            </label>
          </div>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">Question</span>
            </div>
            <textarea
              className="textarea textarea-bordered min-h-24"
              placeholder="What is the user's preferred name and where are they based?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <div className="label">
              <span className="label-text-alt text-base-content/40">
                ⌘/Ctrl + Enter to submit
              </span>
            </div>
          </label>

          <div className="card-actions justify-end">
            <button
              className="btn btn-primary"
              onClick={() => void handleSubmit()}
              disabled={loading || !query.trim() || !workspaceId || !observerId}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Diagnose"}
            </button>
          </div>

          {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
        </div>
      </div>

      {result && <DiagnoseResult result={result} />}

      {!result && !loading && !error && (
        <div className="alert alert-info text-sm">
          <span>Run a query to see what context and answer Honcho produces.</span>
        </div>
      )}
    </div>
  );
}

function DiagnoseResult({ result }: { result: DiagnoseResponse }) {
  const answerIsError = "error" in result.answer;
  const searchHasError = "error" in result.search;

  return (
    <div className="space-y-4">
      <div className="text-xs text-base-content/50 font-mono">
        {result.meta.observerId}
        {result.meta.targetId && result.meta.targetId !== result.meta.observerId
          ? ` → ${result.meta.targetId}`
          : ""}
        {" · "}
        reasoning: {result.meta.reasoningLevel} · {result.meta.durationMs}ms
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Honcho answer"
          subtitle="What a downstream model would receive from the dialectic endpoint"
        >
          {answerIsError ? (
            <ErrorBlock text={(result.answer as { error: string }).error} />
          ) : (
            <pre className="text-sm whitespace-pre-wrap">
              {(result.answer as { content: string | null }).content ?? "(empty response)"}
            </pre>
          )}
        </Panel>

        <Panel
          title="Peer card (target)"
          subtitle="The curated list of identity facts Honcho has distilled"
        >
          {result.profile.errors.peer_card ? (
            <ErrorBlock text={result.profile.errors.peer_card} />
          ) : result.profile.peer_card?.peer_card && result.profile.peer_card.peer_card.length > 0 ? (
            <ul className="list-disc list-inside text-sm space-y-1">
              {result.profile.peer_card.peer_card.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-base-content/50">No peer card found for this target.</p>
          )}
        </Panel>

        <Panel
          title="Context (representation + card)"
          subtitle="What the GET /peers/{id}/context endpoint returns"
        >
          {result.profile.errors.context ? (
            <ErrorBlock text={result.profile.errors.context} />
          ) : result.profile.context ? (
            <div className="space-y-3">
              {result.profile.context.representation && (
                <div>
                  <h4 className="text-xs font-semibold text-base-content/60 uppercase mb-1">Representation</h4>
                  <pre className="text-sm whitespace-pre-wrap text-base-content/80">
                    {result.profile.context.representation}
                  </pre>
                </div>
              )}
              {result.profile.context.peer_card && result.profile.context.peer_card.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-base-content/60 uppercase mb-1">Card</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {result.profile.context.peer_card.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!result.profile.context.representation &&
                (!result.profile.context.peer_card || result.profile.context.peer_card.length === 0) && (
                <p className="text-sm text-base-content/50">Context endpoint returned no content.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-base-content/50">No context available.</p>
          )}
        </Panel>

        <Panel
          title="Representation (long form)"
          subtitle="GET /peers/{id}/representation"
        >
          {result.profile.errors.representation ? (
            <ErrorBlock text={result.profile.errors.representation} />
          ) : result.profile.representation ? (
            <pre className="text-sm whitespace-pre-wrap text-base-content/80">
              {result.profile.representation}
            </pre>
          ) : (
            <p className="text-sm text-base-content/50">No representation has been generated for this peer yet.</p>
          )}
        </Panel>

        <Panel
          title="Peer message recall (semantic search)"
          subtitle="What Honcho retrieved from the peer's message history"
          wide
        >
          {searchHasError ? (
            <ErrorBlock text={(result.search as { error: string }).error} />
          ) : result.search.hits.length === 0 ? (
            <p className="text-sm text-base-content/50">No matching messages.</p>
          ) : (
            <div className="space-y-2">
              {result.search.hits.map((hit) => (
                <div key={hit.id} className="border-l-2 border-base-300 pl-3">
                  <p className="text-sm whitespace-pre-wrap">{hit.content}</p>
                  <p className="text-xs text-base-content/40 font-mono mt-1">
                    {hit.peer_id ?? "?"} · {hit.created_at ?? "unknown time"} · msg {hit.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title, subtitle, children, wide = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={`card bg-base-100 shadow ${wide ? "lg:col-span-2" : ""}`}>
      <div className="card-body p-4">
        <h3 className="card-title text-base">{title}</h3>
        {subtitle && <p className="text-xs text-base-content/50 -mt-1 mb-2">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function ErrorBlock({ text }: { text: string }) {
  return (
    <div className="alert alert-error text-xs">
      <span className="font-mono break-all">{text}</span>
    </div>
  );
}
