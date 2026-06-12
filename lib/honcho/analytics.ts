import { honchoPost } from "./client";
import { listWorkspaces } from "./workspaces";
import { listSessions } from "./sessions";
import type { Message, Session, Workspace, Page, Conclusion } from "./types";

// All analytics functions are date-keyed (ISO YYYY-MM-DD) so the
// results compose cleanly with @visx/scale and the chart layer.
// `bin` is "0-pad to 0" — empty days are present with `count: 0` so
// line charts have continuous time axes.

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
const listAllConclusions = async (workspaceId: string): Promise<readonly Conclusion[]> => {
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
};

// PAGE-WALKING for messages within a session.
const listAllMessages = async (workspaceId: string, sessionId: string): Promise<readonly Message[]> => {
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
};

// Recursive session listing. Workspace-scoped — the peer-scoped
// `/peers/{id}/sessions/list` 404s on this Honcho build, so we walk
// the workspace-level endpoint instead. That returns every session
// in the workspace regardless of author, which is what we want for
// activity volume.
const listAllSessions = async (workspaceId: string): Promise<readonly Session[]> => {
  const fetchPage = async (page: number, acc: readonly Session[]): Promise<readonly Session[]> => {
    if (page > 50) return acc;
    const result: Page<Session> = await listSessions(workspaceId, { page, size: 200 });
    const next = [...acc, ...result.items];
    if (next.length >= result.total || result.items.length === 0) return next;
    return fetchPage(page + 1, next);
  };
  return fetchPage(1, []);
};

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
