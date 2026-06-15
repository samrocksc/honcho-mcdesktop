import { honchoPost } from "./client";
import { listWorkspaces } from "./workspaces";
import { listSessions } from "./sessions";
import type { Message, Session, Workspace, Page, Conclusion } from "./types";

// All analytics functions are date-keyed (ISO YYYY-MM-DD) so the
// results compose cleanly with @visx/scale and the chart layer.
// `bin` is "0-pad to 0" — empty days are present with `count: 0` so
// line charts have continuous time axes.

// ── Server-side TTL memo ───────────────────────────────────────────────────
// Persists across requests within the same Node process instance.
// Concurrent requests for the same key share one in-flight promise.
// Errors are not cached — the next caller retries immediately.
const CACHE_TTL_MS = 5 * 60 * 1000;
const _memo = new Map<string, { promise: Promise<unknown>; expires: number }>();
export const _testClearCache = (): void => _memo.clear();
const memoTTL = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const hit = _memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;
  const p = fn();
  _memo.set(key, { promise: p as Promise<unknown>, expires: Date.now() + CACHE_TTL_MS });
  p.catch(() => _memo.delete(key));
  return p;
};

// One bin of activity.
export type DailyBin = {
  readonly date: string // YYYY-MM-DD
  readonly count: number
}

// Per-workspace activity over a date range.
export type WorkspaceTimeline = {
  readonly workspaceId: string
  readonly bins: readonly DailyBin[]
  readonly total: number
}

// A whole-workspace time-series view, ready for Visx.
export type StatsResponse = {
  readonly range: { readonly start: string; readonly end: string }
  readonly workspaces: readonly WorkspaceTimeline[]
  readonly grandTotal: number
}

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

const fillDateRange = (start: Date, end: Date, counts: Map<string, number>): readonly DailyBin[] => {
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Array.from({ length: dayCount }, (_, i) => {
    const key = isoDate(new Date(start.getTime() + i * 86400000));
    return { date: key, count: counts.get(key) ?? 0 };
  });
};

const dateRange = (days: number): { readonly start: Date; readonly end: Date } => {
  const now = new Date();
  const endOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999);
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  return {
    start: new Date(startOfToday - (days - 1) * 86400000),
    end: new Date(endOfToday),
  };
};

// Group a list of date-bearing items by ISO day.
const groupByDay = <T extends Readonly<Record<string, unknown>>>(
  items: readonly T[],
  field: keyof T & string,
): Map<string, number> => items.reduce<Map<string, number>>((m, item) => {
  const raw = item[field];
  if (typeof raw !== "string") return m;
  const key = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return m;
  return new Map([...m, [key, (m.get(key) ?? 0) + 1]]);
}, new Map<string, number>());

// PAGE-WALKING: conclusion listings paginate, so for >200 conclusions
// per workspace we need to walk pages. Safety cap at 50 pages × 200.
const listAllConclusions = (workspaceId: string): Promise<readonly Conclusion[]> =>
  memoTTL(`c:${workspaceId}`, () => {
    const fetchPage = async (page: number, acc: readonly Conclusion[]): Promise<readonly Conclusion[]> => {
      if (page > 50) return acc;
      const result: Page<Conclusion> = await honchoPost(
        `/v3/workspaces/${workspaceId}/conclusions/list`,
        { page, size: 200, reverse: false },
      );
      const next = [...acc, ...result.items];
      if (next.length >= result.total || result.items.length === 0) return next;
      return fetchPage(page + 1, next);
    };
    return fetchPage(1, []);
  });

// PAGE-WALKING for messages within a session.
const listAllMessages = (workspaceId: string, sessionId: string): Promise<readonly Message[]> =>
  memoTTL(`m:${workspaceId}:${sessionId}`, () => {
    const fetchPage = async (page: number, acc: readonly Message[]): Promise<readonly Message[]> => {
      if (page > 50) return acc;
      const result: Page<Message> = await honchoPost(
        `/v3/workspaces/${workspaceId}/sessions/${sessionId}/messages/list`,
        { page, size: 200, reverse: false },
      );
      const next = [...acc, ...result.items];
      if (next.length >= result.total || result.items.length === 0) return next;
      return fetchPage(page + 1, next);
    };
    return fetchPage(1, []);
  });

// Recursive session listing. Workspace-scoped — the peer-scoped
// `/peers/{id}/sessions/list` 404s on this Honcho build, so we walk
// the workspace-level endpoint instead. That returns every session
// in the workspace regardless of author, which is what we want for
// activity volume.
const listAllSessions = (workspaceId: string): Promise<readonly Session[]> =>
  memoTTL(`s:${workspaceId}`, () => {
    const fetchPage = async (page: number, acc: readonly Session[]): Promise<readonly Session[]> => {
      if (page > 50) return acc;
      const result: Page<Session> = await listSessions(workspaceId, { page, size: 200 });
      const next = [...acc, ...result.items];
      if (next.length >= result.total || result.items.length === 0) return next;
      return fetchPage(page + 1, next);
    };
    return fetchPage(1, []);
  });

// Volume-over-time for one workspace: conclusion count by day.
// Cheap — single paginated walk per workspace.
const conclusionsTimeline = async (workspaceId: string, start: Date, end: Date): Promise<WorkspaceTimeline> => {
  const all = await listAllConclusions(workspaceId);
  const counts = groupByDay(all, "created_at");
  const bins = fillDateRange(start, end, counts);
  return { workspaceId, bins, total: all.length };
};

// Volume-over-time for one workspace: message count by day.
// Walks sessions → messages. Workspace-scoped session listing.
const messagesTimeline = async (workspaceId: string, start: Date, end: Date): Promise<WorkspaceTimeline> => {
  const sessions = await listAllSessions(workspaceId);
  // Fan out: every session's messages, in parallel.
  const messagesBySession = await Promise.allSettled(
    sessions.map((s) => listAllMessages(workspaceId, s.id)),
  );
  const allMessages: readonly Message[] = messagesBySession
    .filter((r): r is PromiseFulfilledResult<readonly Message[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  const counts = groupByDay(allMessages, "created_at");
  const bins = fillDateRange(start, end, counts);
  return { workspaceId, bins, total: allMessages.length };
};

// ── Runbook (conclusion) freshness ─────────────────────────────────────────

export type FreshnessBuckets = {
  readonly fresh: number  // < 7 days
  readonly recent: number // 7–30 days
  readonly aging: number  // 30–90 days
  readonly stale: number  // > 90 days
}

export type RunbookFreshnessRow = {
  readonly workspaceId: string
  readonly buckets: FreshnessBuckets
  readonly total: number
  readonly oldestDays: number
}

export type RunbookFreshnessResponse = {
  readonly rows: readonly RunbookFreshnessRow[]
  readonly asOf: string // ISO YYYY-MM-DD
}

const daysBetween = (past: Date, now: Date): number =>
  Math.floor((now.getTime() - past.getTime()) / 86400000);

export const getRunbookFreshness = async (): Promise<RunbookFreshnessResponse> => {
  const now = new Date();
  const workspaces = await listWorkspaces().then((p) => p.items);

  const settled = await Promise.allSettled(
    workspaces.map(async (w): Promise<RunbookFreshnessRow> => {
      const conclusions = await listAllConclusions(w.id);
      const buckets: { fresh: number; recent: number; aging: number; stale: number } =
        { fresh: 0, recent: 0, aging: 0, stale: 0 };
      let oldestDays = 0;
      for (const c of conclusions) {
        const age = daysBetween(new Date(c.created_at), now);
        oldestDays = Math.max(oldestDays, age);
        if (age < 7) buckets.fresh++;
        else if (age < 30) buckets.recent++;
        else if (age < 90) buckets.aging++;
        else buckets.stale++;
      }
      return { workspaceId: w.id, buckets, total: conclusions.length, oldestDays };
    }),
  );

  const rows = settled
    .filter((r): r is PromiseFulfilledResult<RunbookFreshnessRow> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.oldestDays - a.oldestDays);

  return { rows, asOf: isoDate(now) };
};

// ── Cross-workspace coverage ───────────────────────────────────────────────

export type CoverageCell = {
  readonly workspaceId: string
  readonly count: number
}

export type PeerCoverageRow = {
  readonly peerId: string
  readonly cells: readonly CoverageCell[]
  readonly total: number
}

export type CrossWorkspaceCoverageResponse = {
  readonly workspaceIds: readonly string[]
  readonly peers: readonly PeerCoverageRow[]  // sorted by total desc, capped at 30
  readonly asOf: string
}

export const getCrossWorkspaceCoverage = async (): Promise<CrossWorkspaceCoverageResponse> => {
  const now = new Date();
  const workspaces = await listWorkspaces().then((p) => p.items);

  // Fetch all conclusions per workspace in parallel.
  const perWorkspace = await Promise.allSettled(
    workspaces.map(async (w) => ({ workspaceId: w.id, conclusions: await listAllConclusions(w.id) })),
  );

  const workspaceData = perWorkspace
    .filter((r): r is PromiseFulfilledResult<{ workspaceId: string; conclusions: readonly Conclusion[] }> =>
      r.status === "fulfilled")
    .map((r) => r.value);

  const workspaceIds = workspaceData.map((w) => w.workspaceId);

  // peer (observer_id) × workspaceId → count
  const grid = new Map<string, Map<string, number>>();
  for (const { workspaceId, conclusions } of workspaceData) {
    for (const c of conclusions) {
      if (!grid.has(c.observer_id)) grid.set(c.observer_id, new Map());
      const row = grid.get(c.observer_id)!;
      row.set(workspaceId, (row.get(workspaceId) ?? 0) + 1);
    }
  }

  const peerRows: PeerCoverageRow[] = [];
  for (const [peerId, wsMap] of grid) {
    const cells = workspaceIds.map((wid) => ({ workspaceId: wid, count: wsMap.get(wid) ?? 0 }));
    peerRows.push({ peerId, cells, total: cells.reduce((s, c) => s + c.count, 0) });
  }
  peerRows.sort((a, b) => b.total - a.total);

  return { workspaceIds, peers: peerRows.slice(0, 30), asOf: isoDate(now) };
};

// ── Peer activity heatmap ──────────────────────────────────────────────────

export type HeatmapCell = {
  readonly date: string  // YYYY-MM-DD
  readonly count: number
}

export type PeerHeatmapRow = {
  readonly peerId: string
  readonly cells: readonly HeatmapCell[]
  readonly total: number
}

export type PeerActivityResponse = {
  readonly dateAxis: readonly string[]  // YYYY-MM-DD, one per day in range
  readonly peers: readonly PeerHeatmapRow[]  // sorted by total desc, capped at 20
  readonly asOf: string
}

export const getPeerActivity = async (days = 30): Promise<PeerActivityResponse> => {
  const now = new Date();
  const { start, end } = dateRange(days);
  const startStr = isoDate(start);
  const endStr = isoDate(end);
  const workspaces = await listWorkspaces().then((p) => p.items);

  const perWorkspace = await Promise.allSettled(
    workspaces.map(async (w) => {
      const sessions = await listAllSessions(w.id);
      const bySession = await Promise.allSettled(sessions.map((s) => listAllMessages(w.id, s.id)));
      return bySession
        .filter((r): r is PromiseFulfilledResult<readonly Message[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
    }),
  );

  const allMessages = perWorkspace
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<readonly Message[]>).value)
    .filter((m) => {
      const d = m.created_at.slice(0, 10);
      return d >= startStr && d <= endStr;
    });

  // peer_id × date → count
  const grid = new Map<string, Map<string, number>>();
  for (const msg of allMessages) {
    const date = msg.created_at.slice(0, 10);
    if (!grid.has(msg.peer_id)) grid.set(msg.peer_id, new Map());
    const row = grid.get(msg.peer_id)!;
    row.set(date, (row.get(date) ?? 0) + 1);
  }

  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const dateAxis = Array.from<unknown, string>(
    { length: dayCount },
    (_, i) => isoDate(new Date(start.getTime() + i * 86400000)),
  );

  const peerRows: PeerHeatmapRow[] = [];
  for (const [peerId, dayMap] of grid) {
    const cells = dateAxis.map((date) => ({ date, count: dayMap.get(date) ?? 0 }));
    peerRows.push({ peerId, cells, total: cells.reduce((s, c) => s + c.count, 0) });
  }
  peerRows.sort((a, b) => b.total - a.total);

  return { dateAxis, peers: peerRows.slice(0, 20), asOf: isoDate(now) };
};

// ── Volume-over-time (main entry point) ────────────────────────────────────

// Main entry point. Returns a `StatsResponse` ready to feed Visx.
export type GetStatsOptions = {
  readonly days?: number // default 30
  readonly include?: "conclusions" | "messages" | "both" // default 'both'
  readonly workspaces?: readonly string[] // default: all
}

export const getStats = async (options: GetStatsOptions = {}): Promise<StatsResponse> => {
  const days = options.days ?? 30;
  const include = options.include ?? "both";
  const { start, end } = dateRange(days);

  const workspaces = await (
    options.workspaces && options.workspaces.length > 0
      ? listWorkspaces().then((all) => {
          const wanted = new Set(options.workspaces);
          return all.items.filter((w) => wanted.has(w.id));
        })
      : listWorkspaces().then((all): readonly Workspace[] => all.items)
  );

  const timelines = await Promise.allSettled(
    workspaces.flatMap((w) => {
      if (include === "conclusions") return [conclusionsTimeline(w.id, start, end)];
      if (include === "messages") return [messagesTimeline(w.id, start, end)];
      // 'both': merge the two timelines by summing per-day counts.
      return [
        (async (): Promise<WorkspaceTimeline> => {
          const [c, m] = await Promise.allSettled([
            conclusionsTimeline(w.id, start, end),
            messagesTimeline(w.id, start, end),
          ]);
          const cBins = c.status === "fulfilled" ? c.value.bins : fillDateRange(start, end, new Map());
          const mBins = m.status === "fulfilled" ? m.value.bins : fillDateRange(start, end, new Map());
          const merged = cBins.map((b, i) => ({
            date: b.date,
            count: b.count + (mBins[i]?.count ?? 0),
          }));
          return {
            workspaceId: w.id,
            bins: merged,
            total: cBins.reduce((s, b) => s + b.count, 0) + mBins.reduce((s, b) => s + b.count, 0),
          };
        })(),
      ];
    }),
  );

  const result: readonly WorkspaceTimeline[] = timelines
    .filter((t): t is PromiseFulfilledResult<WorkspaceTimeline> => t.status === "fulfilled")
    .map((t) => t.value);

  const grandTotal = result.reduce((s, w) => s + w.total, 0);

  return {
    range: { start: isoDate(start), end: isoDate(end) },
    workspaces: result,
    grandTotal,
  };
};

// ── Consolidated stats (single workspace scan for volume + freshness + coverage) ───

export type ConsolidatedStatsResponse = {
  readonly volume: StatsResponse
  readonly freshness: RunbookFreshnessResponse
  readonly coverage: CrossWorkspaceCoverageResponse
}

// Fetches all workspace conclusions once and computes all three conclusion-based
// views in a single pass, avoiding the 3× duplicate fan-out from calling each
// analytics function independently.
export const getConsolidatedStats = async (options: GetStatsOptions = {}): Promise<ConsolidatedStatsResponse> => {
  const days = options.days ?? 30;
  const include = options.include ?? "conclusions";
  const { start, end } = dateRange(days);
  const now = new Date();

  const allWorkspaces = await listWorkspaces().then((p) => p.items);

  const conclusionResults = await Promise.allSettled(
    allWorkspaces.map(async (w) => ({ workspaceId: w.id, conclusions: await listAllConclusions(w.id) })),
  );

  const workspaceData = conclusionResults
    .filter((r): r is PromiseFulfilledResult<{ workspaceId: string; conclusions: readonly Conclusion[] }> =>
      r.status === "fulfilled")
    .map((r) => r.value);

  // --- FRESHNESS (single pass over conclusions) ---
  const freshnessRows: RunbookFreshnessRow[] = workspaceData.map(({ workspaceId, conclusions }) => {
    const buckets = { fresh: 0, recent: 0, aging: 0, stale: 0 };
    let oldestDays = 0;
    for (const c of conclusions) {
      const age = daysBetween(new Date(c.created_at), now);
      oldestDays = Math.max(oldestDays, age);
      if (age < 7) buckets.fresh++;
      else if (age < 30) buckets.recent++;
      else if (age < 90) buckets.aging++;
      else buckets.stale++;
    }
    return { workspaceId, buckets, total: conclusions.length, oldestDays };
  });
  freshnessRows.sort((a, b) => b.oldestDays - a.oldestDays);

  // --- COVERAGE ---
  const grid = new Map<string, Map<string, number>>();
  const workspaceIds: string[] = workspaceData.map((w) => w.workspaceId);
  for (const { workspaceId, conclusions } of workspaceData) {
    for (const c of conclusions) {
      if (!grid.has(c.observer_id)) grid.set(c.observer_id, new Map());
      const row = grid.get(c.observer_id)!;
      row.set(workspaceId, (row.get(workspaceId) ?? 0) + 1);
    }
  }
  const coveragePeers: PeerCoverageRow[] = [];
  for (const [peerId, wsMap] of grid) {
    const cells = workspaceIds.map((wid) => ({ workspaceId: wid, count: wsMap.get(wid) ?? 0 }));
    coveragePeers.push({ peerId, cells, total: cells.reduce((s, c) => s + c.count, 0) });
  }
  coveragePeers.sort((a, b) => b.total - a.total);

  // --- VOLUME (conclusions timeline from data already in hand) ---
  const conclusionTimelines: WorkspaceTimeline[] = workspaceData.map(({ workspaceId, conclusions }) => ({
    workspaceId,
    bins: fillDateRange(start, end, groupByDay(conclusions, "created_at")),
    total: conclusions.length,
  }));

  let volumeTimelines: readonly WorkspaceTimeline[];
  if (include === "conclusions") {
    volumeTimelines = conclusionTimelines;
  } else if (include === "messages") {
    const results = await Promise.allSettled(allWorkspaces.map((w) => messagesTimeline(w.id, start, end)));
    volumeTimelines = results
      .filter((r): r is PromiseFulfilledResult<WorkspaceTimeline> => r.status === "fulfilled")
      .map((r) => r.value);
  } else {
    const results = await Promise.allSettled(allWorkspaces.map((w) => messagesTimeline(w.id, start, end)));
    const msgMap = new Map(
      results
        .filter((r): r is PromiseFulfilledResult<WorkspaceTimeline> => r.status === "fulfilled")
        .map((r) => [r.value.workspaceId, r.value]),
    );
    volumeTimelines = conclusionTimelines.map((ct) => {
      const mt = msgMap.get(ct.workspaceId);
      if (!mt) return ct;
      return {
        workspaceId: ct.workspaceId,
        bins: ct.bins.map((b, i) => ({ date: b.date, count: b.count + (mt.bins[i]?.count ?? 0) })),
        total: ct.total + mt.total,
      };
    });
  }

  return {
    volume: {
      range: { start: isoDate(start), end: isoDate(end) },
      workspaces: volumeTimelines,
      grandTotal: volumeTimelines.reduce((s, w) => s + w.total, 0),
    },
    freshness: { rows: freshnessRows, asOf: isoDate(now) },
    coverage: { workspaceIds, peers: coveragePeers.slice(0, 30), asOf: isoDate(now) },
  };
};
