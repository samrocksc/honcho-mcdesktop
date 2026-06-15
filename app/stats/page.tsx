"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleTime, scaleLinear } from "@visx/scale";
import { LinePath, Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip, useTooltipInPortal, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { timeFormat } from "d3-time-format";

type FreshnessBuckets = {
  fresh: number  // < 7 days
  recent: number // 7–30 days
  aging: number  // 30–90 days
  stale: number  // > 90 days
}

type FreshnessRow = {
  workspaceId: string
  buckets: FreshnessBuckets
  total: number
  oldestDays: number
}

type FreshnessResponse = {
  rows: FreshnessRow[]
  asOf: string
}

type CoverageCell = { workspaceId: string; count: number }

type PeerCoverageRow = {
  peerId: string
  cells: CoverageCell[]
  total: number
}

type CrossWorkspaceCoverageResponse = {
  workspaceIds: string[]
  peers: PeerCoverageRow[]
  asOf: string
}

type HeatmapCell = { date: string; count: number }

type PeerHeatmapRow = {
  peerId: string
  cells: HeatmapCell[]
  total: number
}

type PeerActivityResponse = {
  dateAxis: string[]
  peers: PeerHeatmapRow[]
  asOf: string
}

type DailyBin = {
  readonly date: string
  readonly count: number
}

type WorkspaceTimeline = {
  readonly workspaceId: string
  readonly bins: readonly DailyBin[]
  readonly total: number
}

type StatsResponse = {
  readonly range: { readonly start: string; readonly end: string }
  readonly workspaces: readonly WorkspaceTimeline[]
  readonly grandTotal: number
}

type ConsolidatedResponse = {
  volume: StatsResponse
  freshness: FreshnessResponse
  coverage: CrossWorkspaceCoverageResponse
}

// Monochrome palette: 4 grayscale hexes, one per workspace.
// Amber pair reserved for the runbook-freshness panel (aging/stale).
const PALETTE = [
  "#1a1a1a",   // near-black
  "#595959",   // mid gray
  "#a6a6a6",   // light gray
  "#d1d1d1",   // very light gray
] as const;

const AMBER_AGING = "#f59e0b";
const AMBER_STALE = "#d97706";

const AXIS_GRAY = "#737373";
const FONT = "ui-monospace, SFMono-Regular, \"SF Mono\", Menlo, Consolas, monospace";
const FONT_DISPLAY = "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif";

type Include = "conclusions" | "messages" | "both"

const INCLUDE_OPTIONS: readonly { value: Include; label: string; help: string }[] = [
  { value: "conclusions", label: "conclusions", help: "curated facts" },
  { value: "messages", label: "messages", help: "raw session messages" },
  { value: "both", label: "both", help: "sum of both" },
];

export default function StatsPage() {
  const [days, setDays] = useState(7);
  const [include, setInclude] = useState<Include>("conclusions");
  const [allData, setAllData] = useState<ConsolidatedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [heatmap, setHeatmap] = useState<PeerActivityResponse | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState("");

  const heatmapRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats/all?days=${days}&include=${include}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setAllData(await res.json() as ConsolidatedResponse);
    } catch (e) {
      setError(String(e));
      setAllData(null);
    } finally {
      setLoading(false);
    }
  }, [days, include]);

  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true);
    setHeatmapError("");
    try {
      const res = await fetch("/api/stats/heatmap?days=30", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setHeatmap(await res.json() as PeerActivityResponse);
    } catch (e) {
      setHeatmapError(String(e));
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Lazy-load heatmap when its panel scrolls into view.
  useEffect(() => {
    const el = heatmapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { void fetchHeatmap(); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchHeatmap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: FONT_DISPLAY }}>Stats</h1>
        <p className="text-sm text-base-content/60 mt-1" style={{ fontFamily: FONT_DISPLAY }}>
          Volume over time, runbook freshness, peer activity, and cross-workspace coverage.
          Monochrome by design — data shape carries the signal.
        </p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body py-4 space-y-3">
          <div className="flex flex-wrap items-end gap-6">
            <label className="form-control">
              <div className="label py-1"><span className="label-text text-xs font-medium" style={{ fontFamily: FONT_DISPLAY }}>Time window</span></div>
              <div className="join">
                {[7, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`btn btn-sm join-item ${days === d ? "btn-neutral" : "btn-outline"}`}
                    onClick={() => setDays(d)}
                    style={{ fontFamily: FONT }}
                  >
                    {d === 365 ? "1y" : `${d}d`}
                  </button>
                ))}
              </div>
            </label>
            <label className="form-control">
              <div className="label py-1"><span className="label-text text-xs font-medium" style={{ fontFamily: FONT_DISPLAY }}>What to count</span></div>
              <div className="join">
                {INCLUDE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    title={o.help}
                    className={`btn btn-sm join-item ${include === o.value ? "btn-neutral" : "btn-outline"}`}
                    onClick={() => setInclude(o.value)}
                    style={{ fontFamily: FONT }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </label>
            <div className="ml-auto text-xs text-base-content/40" style={{ fontFamily: FONT }}>
              {allData ? `${allData.volume.range.start} → ${allData.volume.range.end}` : "—"}
              {loading && <span className="ml-3 loading loading-spinner loading-xs" />}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

      {allData && (
        <div className="grid grid-cols-1 gap-6">
          <Panel
            title="Volume over time"
            subtitle="Per-workspace daily counts. Hover for details."
          >
            <VolumeChart data={allData.volume} />
          </Panel>

          <Panel
            title="Runbook freshness"
            subtitle="Age of conclusions (curated facts) per workspace. Amber = aging or stale."
          >
            <FreshnessPanel rows={allData.freshness.rows} asOf={allData.freshness.asOf} />
          </Panel>

          <div ref={heatmapRef}>
            <Panel
              title="Peer activity heatmap"
              subtitle="Messages per peer per day, last 30 days. Darker = more messages."
              headerRight={heatmapLoading ? <span className="loading loading-spinner loading-xs opacity-40" /> : undefined}
            >
              {heatmapError
                ? <div className="alert alert-error text-sm"><span>{heatmapError}</span></div>
                : heatmap
                  ? <ActivityHeatmap data={heatmap} />
                  : <Placeholder label="peer activity heatmap" />
              }
            </Panel>
          </div>

          <Panel
            title="Cross-workspace coverage"
            subtitle="Conclusion counts per peer per workspace. Darker = more conclusions."
          >
            <CoverageMatrix data={allData.coverage} />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({ title, subtitle, headerRight, children }: { title: string; subtitle: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-base" style={{ fontFamily: FONT_DISPLAY }}>{title}</h3>
          {headerRight}
        </div>
        <p className="text-xs text-base-content/50 -mt-1 mb-2" style={{ fontFamily: FONT_DISPLAY }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

const FRESHNESS_SEGMENTS = [
  { key: "fresh" as const, label: "< 7d", color: PALETTE[0] },
  { key: "recent" as const, label: "7–30d", color: PALETTE[1] },
  { key: "aging" as const, label: "30–90d", color: AMBER_AGING },
  { key: "stale" as const, label: "> 90d", color: AMBER_STALE },
] as const;

function FreshnessPanel({ rows, asOf }: { rows: FreshnessRow[]; asOf: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-base-content/40" style={{ fontFamily: FONT }}>No workspaces found.</p>;
  }

  const anyAging = rows.some((r) => r.buckets.aging > 0 || r.buckets.stale > 0);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {FRESHNESS_SEGMENTS.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs" style={{ fontFamily: FONT, color: AXIS_GRAY }}>
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
            {label}
          </span>
        ))}
        {anyAging && (
          <span className="ml-auto text-xs" style={{ fontFamily: FONT, color: AMBER_AGING }}>
            amber = needs review
          </span>
        )}
      </div>

      {/* One stacked bar per workspace */}
      <div className="space-y-2.5">
        {rows.map((row) => <FreshnessBarRow key={row.workspaceId} row={row} />)}
      </div>

      <p className="text-xs text-base-content/30" style={{ fontFamily: FONT }}>as of {asOf}</p>
    </div>
  );
}

function FreshnessBarRow({ row }: { row: FreshnessRow }) {
  const { buckets, total, workspaceId, oldestDays } = row;
  const shortId = workspaceId.length > 12 ? `${workspaceId.slice(0, 8)}…` : workspaceId;
  const pct = (n: number) => total > 0 ? (n / total) * 100 : 0;
  const staleCount = buckets.aging + buckets.stale;
  const stalePct = total > 0 ? Math.round((staleCount / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-20 shrink-0 text-right text-xs truncate"
        style={{ fontFamily: FONT, color: AXIS_GRAY }}
        title={workspaceId}
      >
        {shortId}
      </div>

      <div className="flex-1" style={{ height: 18 }}>
        {total === 0 ? (
          <div className="w-full h-full border border-dashed border-base-300 rounded-sm" />
        ) : (
          <div className="flex h-full rounded-sm overflow-hidden">
            {FRESHNESS_SEGMENTS.map(({ key, color }) => {
              const w = pct(buckets[key]);
              if (w === 0) return null;
              return (
                <div
                  key={key}
                  style={{ width: `${w}%`, background: color, flexShrink: 0 }}
                  title={`${buckets[key]} (${Math.round(w)}%)`}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="w-36 shrink-0 text-xs" style={{ fontFamily: FONT, color: AXIS_GRAY }}>
        {total === 0
          ? <span className="opacity-40">no conclusions</span>
          : (
            <>
              {total} total · oldest {oldestDays}d
              {stalePct > 0 && (
                <span style={{ color: AMBER_AGING }}> · {stalePct}% aging</span>
              )}
            </>
          )
        }
      </div>
    </div>
  );
}

const CELL = 13;
const GAP = 2;
const STEP = CELL + GAP;
const LEFT_MARGIN = 90;
const TOP_MARGIN = 24;

const heatColor = (count: number, max: number): string => {
  if (count === 0 || max === 0) return "#ebebeb";
  const r = count / max;
  if (r < 0.25) return "#d1d1d1";
  if (r < 0.5) return "#a6a6a6";
  if (r < 0.75) return "#595959";
  return "#1a1a1a";
};

function ActivityHeatmap({ data }: { data: PeerActivityResponse }) {
  const { dateAxis, peers, asOf } = data;
  const [tooltip, setTooltip] = useState<{ peerId: string; date: string; count: number; x: number; y: number } | null>(null);

  if (peers.length === 0) {
    return <p className="text-sm text-base-content/40" style={{ fontFamily: FONT }}>No peer activity in the last 30 days.</p>;
  }

  const maxCount = peers.reduce((m, p) => p.cells.reduce((cm, c) => Math.max(cm, c.count), m), 0);
  const svgWidth = LEFT_MARGIN + dateAxis.length * STEP;
  const svgHeight = TOP_MARGIN + peers.length * STEP + 4;

  const dateLabelIndices = dateAxis
    .map((_, i) => i)
    .filter((i) => i === 0 || i === dateAxis.length - 1 || i % 7 === 0);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} style={{ display: "block", fontFamily: FONT }}>
          {/* Date labels */}
          {dateLabelIndices.map((i) => (
            <text
              key={dateAxis[i]}
              x={LEFT_MARGIN + i * STEP + CELL / 2}
              y={TOP_MARGIN - 6}
              fontSize={9}
              fill={AXIS_GRAY}
              textAnchor="middle"
            >
              {dateAxis[i].slice(5)}
            </text>
          ))}

          {/* Grid */}
          {peers.map((peer, ri) => {
            const y = TOP_MARGIN + ri * STEP;
            return (
              <g key={peer.peerId}>
                {/* Peer label */}
                <text
                  x={LEFT_MARGIN - 6}
                  y={y + CELL / 2 + 3}
                  fontSize={9}
                  fill={AXIS_GRAY}
                  textAnchor="end"
                >
                  {peer.peerId.length > 12 ? peer.peerId.slice(0, 10) + "…" : peer.peerId}
                </text>
                {/* Cells */}
                {peer.cells.map((cell, ci) => (
                  <rect
                    key={cell.date}
                    x={LEFT_MARGIN + ci * STEP}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={heatColor(cell.count, maxCount)}
                    style={{ cursor: cell.count > 0 ? "default" : undefined }}
                    onMouseEnter={(e) => {
                      if (cell.count === 0) return;
                      setTooltip({ peerId: peer.peerId, date: cell.date, count: cell.count, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
                {/* Total */}
                <text
                  x={LEFT_MARGIN + dateAxis.length * STEP + 6}
                  y={y + CELL / 2 + 3}
                  fontSize={9}
                  fill={AXIS_GRAY}
                  opacity={0.6}
                >
                  {peer.total}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Colour scale legend */}
      <div className="flex items-center gap-2 text-xs" style={{ fontFamily: FONT, color: AXIS_GRAY }}>
        <span>less</span>
        {["#ebebeb", "#d1d1d1", "#a6a6a6", "#595959", "#1a1a1a"].map((c) => (
          <span key={c} style={{ width: CELL, height: CELL, background: c, borderRadius: 2, display: "inline-block" }} />
        ))}
        <span>more</span>
        <span className="ml-auto opacity-50">as of {asOf}</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y + 12,
            left: tooltip.x + 12,
            background: "#1a1a1a",
            color: "#f5f5f5",
            border: "1px solid #404040",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: FONT,
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <div style={{ opacity: 0.6 }}>{tooltip.date}</div>
          <div>{tooltip.peerId.slice(0, 16)}{tooltip.peerId.length > 16 ? "…" : ""}</div>
          <div><strong>{tooltip.count}</strong> message{tooltip.count !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}

const COV_CELL_W = 52;
const COV_CELL_H = 18;
const COV_GAP = 2;
const COV_LEFT = 92;
const COV_TOP = 32;
const COV_STEP_W = COV_CELL_W + COV_GAP;
const COV_STEP_H = COV_CELL_H + COV_GAP;

const coverageColor = (count: number, max: number): string => {
  if (count === 0 || max === 0) return "#ebebeb";
  const r = count / max;
  if (r < 0.25) return "#d1d1d1";
  if (r < 0.5) return "#a6a6a6";
  if (r < 0.75) return "#595959";
  return "#1a1a1a";
};

const coverageTextColor = (count: number, max: number): string =>
  count / Math.max(1, max) >= 0.5 ? "#ffffff" : "#1a1a1a";

function CoverageMatrix({ data }: { data: CrossWorkspaceCoverageResponse }) {
  const { workspaceIds, peers, asOf } = data;
  const [tooltip, setTooltip] = useState<{ peerId: string; workspaceId: string; count: number; x: number; y: number } | null>(null);

  if (peers.length === 0) {
    return <p className="text-sm text-base-content/40" style={{ fontFamily: FONT }}>No conclusions found across workspaces.</p>;
  }

  const maxCount = peers.reduce((m, p) => p.cells.reduce((cm, c) => Math.max(cm, c.count), m), 0);
  const svgWidth = COV_LEFT + workspaceIds.length * COV_STEP_W + 48;
  const svgHeight = COV_TOP + peers.length * COV_STEP_H + 4;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} style={{ display: "block", fontFamily: FONT }}>
          {/* Workspace column headers — rotated to save horizontal space */}
          {workspaceIds.map((wid, ci) => (
            <text
              key={wid}
              x={COV_LEFT + ci * COV_STEP_W + COV_CELL_W / 2}
              y={COV_TOP - 6}
              fontSize={9}
              fill={AXIS_GRAY}
              textAnchor="start"
              transform={`rotate(-35, ${COV_LEFT + ci * COV_STEP_W + COV_CELL_W / 2}, ${COV_TOP - 6})`}
            >
              {wid.slice(0, 10)}…
            </text>
          ))}

          {/* Rows */}
          {peers.map((peer, ri) => {
            const y = COV_TOP + ri * COV_STEP_H;
            return (
              <g key={peer.peerId}>
                {/* Peer label */}
                <text
                  x={COV_LEFT - 6}
                  y={y + COV_CELL_H / 2 + 3}
                  fontSize={9}
                  fill={AXIS_GRAY}
                  textAnchor="end"
                >
                  {peer.peerId.length > 12 ? peer.peerId.slice(0, 10) + "…" : peer.peerId}
                </text>

                {/* Cells */}
                {peer.cells.map((cell, ci) => {
                  const x = COV_LEFT + ci * COV_STEP_W;
                  const fill = coverageColor(cell.count, maxCount);
                  const textFill = coverageTextColor(cell.count, maxCount);
                  return (
                    <g key={cell.workspaceId}>
                      <rect
                        x={x}
                        y={y}
                        width={COV_CELL_W}
                        height={COV_CELL_H}
                        rx={2}
                        fill={fill}
                        onMouseEnter={(e) => {
                          if (cell.count === 0) return;
                          setTooltip({ peerId: peer.peerId, workspaceId: cell.workspaceId, count: cell.count, x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      {cell.count > 0 && (
                        <text
                          x={x + COV_CELL_W / 2}
                          y={y + COV_CELL_H / 2 + 3.5}
                          fontSize={9}
                          fill={textFill}
                          textAnchor="middle"
                          style={{ pointerEvents: "none" }}
                        >
                          {cell.count}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Row total */}
                <text
                  x={COV_LEFT + workspaceIds.length * COV_STEP_W + 6}
                  y={y + COV_CELL_H / 2 + 3}
                  fontSize={9}
                  fill={AXIS_GRAY}
                  opacity={0.6}
                >
                  {peer.total}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-base-content/30" style={{ fontFamily: FONT }}>
        {peers.length} peer{peers.length !== 1 ? "s" : ""} · {workspaceIds.length} workspace{workspaceIds.length !== 1 ? "s" : ""} · as of {asOf}
      </p>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y + 12,
            left: tooltip.x + 12,
            background: "#1a1a1a",
            color: "#f5f5f5",
            border: "1px solid #404040",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: FONT,
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <div style={{ opacity: 0.6 }}>workspace {tooltip.workspaceId.slice(0, 12)}…</div>
          <div>{tooltip.peerId.slice(0, 16)}{tooltip.peerId.length > 16 ? "…" : ""}</div>
          <div><strong>{tooltip.count}</strong> conclusion{tooltip.count !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-base-300 rounded-md p-6 text-center text-sm text-base-content/40" style={{ fontFamily: FONT }}>
      [{label}] — coming next
    </div>
  );
}

function VolumeChart({ data }: { data: StatsResponse }) {
  // Combine all workspaces' bins into a single sorted, deduplicated date axis.
  const dateAxis = useMemo(() =>
    Array.from(new Set(data.workspaces.flatMap((w) => w.bins.map((b) => b.date)))).sort(),
  [data]);

  // Build a per-workspace series as {x: Date, y: number}[].
  const series = useMemo(() => data.workspaces.map((w) => ({
    workspaceId: w.workspaceId,
    points: w.bins.map((b) => ({ x: new Date(b.date), y: b.count })),
  })), [data]);

  const xDomain = useMemo(() => {
    if (dateAxis.length === 0) return [new Date(), new Date()] as [Date, Date];
    return [new Date(dateAxis[0]), new Date(dateAxis[dateAxis.length - 1])] as [Date, Date];
  }, [dateAxis]);

  const yMax = useMemo(() =>
    series.reduce((m, s) => s.points.reduce((pm, p) => Math.max(pm, p.y), m), 0),
  [series]);

  if (data.workspaces.length === 0) {
    return <p className="text-sm text-base-content/40" style={{ fontFamily: FONT }}>No workspaces in the data window.</p>;
  }

  return (
    <div className="w-full" style={{ height: 360 }}>
      <ParentSize debounceTime={50}>
        {({ width, height }) => {
          if (width < 50 || height < 50) return null;
          const margin = { top: 16, right: 24, bottom: 32, left: 48 };
          const xScale = scaleTime<number>({ domain: xDomain, range: [margin.left, width - margin.right] });
          const yScale = scaleLinear<number>({ domain: [0, Math.max(1, yMax)], range: [height - margin.bottom, margin.top], nice: true });

          return (
            <ChartInner
              width={width}
              height={height}
              margin={margin}
              xScale={xScale}
              yScale={yScale}
              series={series}
              dateAxis={dateAxis}
            />
          );
        }}
      </ParentSize>
    </div>
  );
}

function ChartInner({
  width, height, margin, xScale, yScale, series, dateAxis,
}: {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  xScale: ReturnType<typeof scaleTime<number>>
  yScale: ReturnType<typeof scaleLinear<number>>
  series: readonly { workspaceId: string; points: { x: Date; y: number }[] }[]
  dateAxis: readonly string[]
}) {
  const fmt = timeFormat("%Y-%m-%d");
  const xTickValues = dateAxis.length <= 8
    ? dateAxis.map((d) => new Date(d))
    : [dateAxis[0], dateAxis[Math.floor(dateAxis.length / 4)], dateAxis[Math.floor(dateAxis.length / 2)], dateAxis[Math.floor((3 * dateAxis.length) / 4)], dateAxis[dateAxis.length - 1]].map((d) => new Date(d));

  const tooltip = useTooltip<{ workspace: string; date: string; count: number }>();
  const { containerRef } = useTooltipInPortal({ scroll: true, detectBounds: true });
  const containerElRef = useRef<HTMLDivElement>(null);

  const handleHover = (workspace: string, date: string, count: number, evt: React.MouseEvent<SVGRectElement>) => {
    const rect = containerElRef.current?.getBoundingClientRect();
    const x = evt.clientX - (rect?.left ?? 0);
    const y = evt.clientY - (rect?.top ?? 0);
    tooltip.showTooltip({
      tooltipData: { workspace, date, count },
      tooltipLeft: x,
      tooltipTop: y,
    });
  };

  return (
    <div ref={(el) => { containerRef(el); containerElRef.current = el; }} className="relative">
      <svg width={width} height={height}>
        <Group>
          {series.map((s, i) => {
            const color = PALETTE[i % PALETTE.length];
            return (
              <LinePath
                key={s.workspaceId}
                data={s.points as { x: Date; y: number }[]}
                x={(d) => xScale(d.x) ?? 0}
                y={(d) => yScale(d.y) ?? 0}
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.95}
              />
            );
          })}
        </Group>
        <AxisLeft
          scale={yScale}
          left={margin.left}
          stroke={AXIS_GRAY}
          tickStroke={AXIS_GRAY}
          tickLabelProps={() => ({
            fill: AXIS_GRAY,
            fontSize: 10,
            fontFamily: FONT,
            textAnchor: "end",
            dx: -4,
            dy: 3,
          })}
          numTicks={4}
        />
        <AxisBottom
          scale={xScale}
          top={height - margin.bottom}
          stroke={AXIS_GRAY}
          tickStroke={AXIS_GRAY}
          tickLabelProps={() => ({
            fill: AXIS_GRAY,
            fontSize: 10,
            fontFamily: FONT,
            textAnchor: "middle",
          })}
          tickValues={xTickValues}
          tickFormat={(v) => fmt(v as Date)}
        />
        {/* invisible hover capture layer (one rect per day column) */}
        <Group>
          {dateAxis.map((d) => {
            const cx = xScale(new Date(d)) ?? 0;
            const colWidth = (width - margin.left - margin.right) / Math.max(1, dateAxis.length);
            return (
              <Bar
                key={d}
                x={cx - colWidth / 2}
                y={margin.top}
                width={colWidth}
                height={height - margin.top - margin.bottom}
                fill="transparent"
                onMouseMove={(e) => {
                  const totals = series.map((s) => ({
                    workspace: s.workspaceId,
                    count: s.points.find((p) => fmt(p.x) === d)?.y ?? 0,
                  }));
                  const sum = totals.reduce((acc, t) => acc + t.count, 0);
                  void handleHover(`all (sum: ${sum})`, d, sum, e as unknown as React.MouseEvent<SVGRectElement>);
                }}
                onMouseLeave={() => tooltip.hideTooltip()}
              />
            );
          })}
        </Group>
      </svg>
      {tooltip.tooltipOpen && tooltip.tooltipData && (
        <TooltipWithBounds
          key={tooltip.tooltipData?.date ?? "tooltip"}
          top={tooltip.tooltipTop}
          left={tooltip.tooltipLeft}
          style={{
            ...defaultStyles,
            background: "#1a1a1a",
            color: "#f5f5f5",
            border: "1px solid #404040",
            borderRadius: 4,
            fontFamily: FONT,
            fontSize: 11,
            padding: "6px 8px",
          }}
        >
          <div>
            <div style={{ opacity: 0.6 }}>{tooltip.tooltipData.date}</div>
            <div>total on day: <strong>{tooltip.tooltipData.count}</strong></div>
            <div className="mt-1" style={{ fontSize: 10, opacity: 0.7 }}>
              {series.map((s, i) => {
                const c = s.points.find((p) => fmt(p.x) === tooltip.tooltipData!.date)?.y ?? 0;
                return (
                  <div key={s.workspaceId} style={{ color: PALETTE[i % PALETTE.length] }}>
                    {s.workspaceId}: {c}
                  </div>
                );
              })}
            </div>
          </div>
        </TooltipWithBounds>
      )}
      {/* Unused, but referenced so TS doesn't strip the import — keep the variable used. */}
      <span style={{ display: "none" }}>{fmt(new Date())}</span>
    </div>
  );
}
