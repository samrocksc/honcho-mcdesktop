"use client";
import { useState, useRef } from "react";
import type { Peer } from "@/lib/honcho/types";
import { DEFAULT_GUIDANCE } from "@/lib/honcho/import";

type Props = {
  readonly workspaceId: string
  readonly peers: readonly Peer[]
  readonly initialObservedId?: string
}

type CardState = "staged" | "committed" | "error"

type ConclusionCard = {
  readonly id: string
  readonly content: string
  readonly filename: string
  state: CardState
  selected: boolean
  error?: string
}

type ImportFile = {
  readonly name: string
  readonly content: string
}

function inferDate(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export default function ImportPanel({ workspaceId, peers, initialObservedId }: Props) {
  const [observerId, setObserverId] = useState(peers[0]?.id ?? "");
  const [observedId, setObservedId] = useState(initialObservedId ?? peers[0]?.id ?? "");
  const [guidance, setGuidance] = useState(DEFAULT_GUIDANCE);
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [cards, setCards] = useState<ConclusionCard[]>([]);
  const [running, setRunning] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noPeers = peers.length === 0;

  const handleFiles = (raw: FileList | null) => {
    if (!raw) return;
    const mdFiles = Array.from(raw).filter((f) => f.name.endsWith(".md"));
    Promise.all(mdFiles.map((f) => f.text().then((content) => ({ name: f.name, content }))))
      .then(setFiles)
      .catch((err: unknown) => setError(String(err)));
  };

  const handleImport = async () => {
    if (!files.length || !observerId || !observedId || running) return;
    setRunning(true);
    setCards([]);
    setSummary(null);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, observer_id: observerId, observed_id: observedId, guidance }),
      });

      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let cardCounter = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as Record<string, unknown>;

            if (event.type === "extracted") {
              const id = String(cardCounter++);
              setCards((prev) => [
                ...prev,
                { id, content: String(event.content), filename: String(event.filename), state: "staged", selected: true },
              ]);
            } else if (event.type === "batch_error") {
              const filename = String(event.filename);
              const errMsg = String(event.error);
              setCards((prev) =>
                prev.map((c) =>
                  c.filename === filename ? { ...c, state: "error", error: errMsg } : c,
                ),
              );
            } else if (event.type === "done") {
              const total = Number(event.total_conclusions);
              const totalFiles = Number(event.total_files);
              const totalErrors = Number(event.total_errors);
              setSummary(
                `${total} conclusion${total !== 1 ? "s" : ""} extracted` +
                ` from ${totalFiles} file${totalFiles !== 1 ? "s" : ""}` +
                (totalErrors > 0 ? ` · ${totalErrors} error(s)` : "") +
                " — review and commit below",
              );
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleCommit = async () => {
    const selected = cards.filter(c => c.selected && c.state === "staged");
    if (!selected.length || committing) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conclusions/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conclusions: selected.map(c => ({
            content: c.content,
            observer_id: observerId,
            observed_id: observedId,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Commit failed: ${res.status}`);
      const committed = selected.map(c => c.id);
      setCards(prev => prev.map(c =>
        committed.includes(c.id) ? { ...c, state: "committed", selected: false } : c
      ));
      setSummary(`${selected.length} conclusion${selected.length !== 1 ? "s" : ""} written`);
    } catch (err) {
      setError(String(err));
    } finally {
      setCommitting(false);
    }
  };

  const stagedCards = cards.filter(c => c.state === "staged");
  const selectedCount = stagedCards.filter(c => c.selected).length;
  const allSelected = stagedCards.length > 0 && selectedCount === stagedCards.length;
  const showReview = !running && stagedCards.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setCards(prev => prev.map(c => c.state === "staged" ? { ...c, selected: false } : c));
    } else {
      setCards(prev => prev.map(c => c.state === "staged" ? { ...c, selected: true } : c));
    }
  };

  const toggleCard = (id: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left panel — config */}
      <div className="lg:w-80 shrink-0 space-y-5">
        <div className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">About Workspace Hydration</h2>
            <p className="text-sm text-base-content/70">
              Upload markdown files — daily notes, knowledge docs, how-tos — and Honcho will
              extract structured conclusions and write them directly into this workspace.
            </p>
            <p className="text-sm text-base-content/70">
              A <strong>conclusion</strong> is a single, persistent fact about a peer — a preference,
              decision, or pattern Honcho can act on in future conversations.
            </p>
            <p className="text-sm text-base-content/70">
              The <strong>guidance prompt</strong> tells Honcho what to focus on. Edit it to change
              what gets extracted.
            </p>
          </div>
        </div>

        {noPeers ? (
          <div className="alert alert-warning text-sm">
            <span>This workspace has no peers. Create a peer before importing.</span>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="label text-sm font-medium">Observer peer</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={observerId}
                  onChange={(e) => setObserverId(e.target.value)}
                  disabled={running}
                >
                  {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="label text-sm font-medium">Observed peer</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={observedId}
                  onChange={(e) => setObservedId(e.target.value)}
                  disabled={running}
                >
                  {peers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="label text-sm font-medium">Guidance prompt</span>
              <textarea
                className="textarea textarea-bordered text-sm w-full"
                rows={5}
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                disabled={running}
              />
            </label>
          </>
        )}
      </div>

      {/* Right panel — files + results */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <p className="text-base-content/60 text-sm">
            Drop <code>.md</code> files here, or{" "}
            <span className="text-primary underline">browse for a folder</span>
          </p>
          <p className="text-xs text-base-content/40 mt-1">
            Drop = individual files · Browse = entire folder (all .md files inside)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            multiple
            // @ts-expect-error webkitdirectory not in React types
            webkitdirectory=""
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f) => {
              const date = inferDate(f.name);
              return (
                <div key={f.name} className="flex items-center justify-between text-sm px-3 py-2 bg-base-200 rounded">
                  <span className="font-mono truncate">{f.name}</span>
                  {date && <span className="text-xs text-base-content/40 ml-2 shrink-0">{date}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Hydrate button */}
        <button
          className="btn btn-primary w-full"
          onClick={handleImport}
          disabled={noPeers || !files.length || running}
        >
          {running
            ? <><span className="loading loading-spinner loading-sm" /> Extracting…</>
            : `Hydrate Workspace (${files.length} file${files.length !== 1 ? "s" : ""})`}
        </button>

        {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

        {/* Summary */}
        {summary && (
          <div className="alert alert-info text-sm"><span>{summary}</span></div>
        )}

        {/* Review toolbar */}
        {showReview && (
          <div className="flex items-center justify-between gap-4 px-1">
            <span className="text-sm text-base-content/60">
              {selectedCount} of {stagedCards.length} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                className="text-sm text-primary underline"
                onClick={toggleSelectAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCommit}
                disabled={selectedCount === 0 || committing}
              >
                {committing
                  ? <><span className="loading loading-spinner loading-xs" /> Committing…</>
                  : `Commit ${selectedCount} selected`}
              </button>
            </div>
          </div>
        )}

        {/* Conclusion cards */}
        {cards.length > 0 && (
          <div className="space-y-2">
            {cards.map((card) => (
              <ConclusionCard
                key={card.id}
                card={card}
                onToggle={card.state === "staged" ? () => toggleCard(card.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConclusionCard({
  card,
  onToggle,
}: {
  readonly card: ConclusionCard
  readonly onToggle?: () => void
}) {
  const stateStyles: Record<CardState, string> = {
    staged:    "bg-base-100 border border-base-300",
    committed: "bg-green-50 border border-green-200",
    error:     "bg-red-50 border border-red-200",
  };
  const labelStyles: Record<CardState, string> = {
    staged:    "text-base-content/30",
    committed: "text-green-500",
    error:     "text-red-400",
  };
  const labels: Record<CardState, string> = {
    staged:    "",
    committed: "✓ written",
    error:     "error",
  };

  const isUnselectedStaged = card.state === "staged" && !card.selected;

  return (
    <div
      className={`rounded-lg px-4 py-3 transition-all duration-300 ${stateStyles[card.state]} ${isUnselectedStaged ? "opacity-50" : ""} ${onToggle ? "cursor-pointer" : ""}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {card.state === "staged" && (
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5 shrink-0"
            checked={card.selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm">{card.content}</p>
          <div className="flex items-center gap-2 mt-1">
            {labels[card.state] && (
              <span className={`text-xs font-mono ${labelStyles[card.state]}`}>
                {labels[card.state]}{card.state === "error" && card.error ? ` — ${card.error}` : ""}
              </span>
            )}
            <span className="text-xs text-base-content/30 font-mono">{card.filename}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
