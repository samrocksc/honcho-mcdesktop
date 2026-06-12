"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleTime, scaleLinear } from "@visx/scale";
import { LinePath, Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip, useTooltipInPortal, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { timeFormat } from "d3-time-format";

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

// Monochrome palette: 4 grayscale hexes, one per workspace.
// A single "stale/empty" warning color (amber) is reserved for the
// future runbook-freshness panel — declared below to keep the
// color contract in one place.
const PALETTE = [
  "#1a1a1a",   // near-black
  "#595959",   // mid gray
  "#a6a6a6",   // light gray
  "#d1d1d1",   // very light gray
] as const;

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
  const [days, setDays] = useState(30);
  const [include, setInclude] = useState<Include>("conclusions");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats?days=${days}&include=${include}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json() as StatsResponse);
    } catch (e) {
      setError(String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days, include]);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

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
              {data ? `${data.range.start} → ${data.range.end}` : "—"}
              {loading && <span className="ml-3 loading loading-spinner loading-xs" />}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

      {data && (
        <div className="grid grid-cols-1 gap-6">
          {/* Volume over time — fully built, working Visx line chart */}
          <Panel
            title="Volume over time"
            subtitle="Per-workspace daily counts. Hover for details."
          >
            <VolumeChart data={data} />
          </Panel>

          {/* Three more panels — placeholders for next session */}
          <Panel title="Runbook freshness" subtitle="Days since each runbook was last referenced in a session.">
            <Placeholder label="runbook freshness" />
          </Panel>
          <Panel title="Peer activity heatmap" subtitle="Messages per peer per day, last 30 days.">
            <Placeholder label="peer activity heatmap" />
          </Panel>
          <Panel title="Cross-workspace coverage" subtitle="Conclusion counts: peer × workspace matrix.">
            <Placeholder label="cross-workspace coverage" />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body p-4">
        <h3 className="card-title text-base" style={{ fontFamily: FONT_DISPLAY }}>{title}</h3>
        <p className="text-xs text-base-content/50 -mt-1 mb-2" style={{ fontFamily: FONT_DISPLAY }}>{subtitle}</p>
        {children}
      </div>
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

  const handleHover = (workspace: string, date: string, count: number, evt: React.MouseEvent<SVGRectElement>) => {
    const x = evt.clientX;
    const y = evt.clientY;
    tooltip.showTooltip({
      tooltipData: { workspace, date, count },
      tooltipLeft: x,
      tooltipTop: y,
    });
  };

  return (
    <div ref={containerRef} className="relative">
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
