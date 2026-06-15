import { describe, it, expect, vi, beforeEach } from "vitest";
import { honchoPost } from "@/lib/honcho/client";
import { listSessions } from "@/lib/honcho/sessions";
import { listWorkspaces } from "@/lib/honcho/workspaces";
import { getStats, _testClearCache } from "@/lib/honcho/analytics";
import type { Page, Session, Workspace } from "@/lib/honcho/types";

vi.mock("@/lib/honcho/client", () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
  honchoPostStream: vi.fn(),
}));
vi.mock("@/lib/honcho/sessions", () => ({ listSessions: vi.fn() }));
vi.mock("@/lib/honcho/workspaces", () => ({ listWorkspaces: vi.fn() }));

const mockPost = vi.mocked(honchoPost);
const mockListSessions = vi.mocked(listSessions);
const mockListWorkspaces = vi.mocked(listWorkspaces);

const ws: Workspace = { id: "ws-1", metadata: {}, configuration: {}, created_at: "2026-01-01T00:00:00Z" };
const session: Session = { id: "s-1", workspace_id: "ws-1", is_active: true, metadata: {}, created_at: "2026-01-01T00:00:00Z" };

describe("getStats (conclusions only)", () => {
  beforeEach(() => {
    _testClearCache();
    mockPost.mockReset();
    mockListSessions.mockReset();
    mockListWorkspaces.mockReset();
  });

  it("returns a timeline per workspace with date-binned counts", async () => {
    mockListWorkspaces.mockResolvedValueOnce({ items: [ws], total: 1, page: 1, size: 50, pages: 1 });
    const today = new Date();
    const yyyy = today.toISOString().slice(0, 10);
    const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
    const conclusion = (date: string) => ({
      id: "c-1", content: "x", observer_id: "sam", observed_id: "sam",
      session_id: "s-1", created_at: date, workspace_id: "ws-1", metadata: {},
    });
    mockPost.mockResolvedValueOnce({
      items: [conclusion(yyyy), conclusion(yyyy), conclusion(yesterday)],
      total: 3, page: 1, size: 200, pages: 1,
    });
    const result = await getStats({ days: 7, include: "conclusions", workspaces: ["ws-1"] });
    expect(result.workspaces).toHaveLength(1);
    const timeline = result.workspaces[0];
    expect(timeline.workspaceId).toBe("ws-1");
    expect(timeline.total).toBe(3);
    // The two `today` conclusions should be on one day, the `yesterday` on another.
    const todayBin = timeline.bins.find((b) => b.date === yyyy);
    const yesterdayBin = timeline.bins.find((b) => b.date === yesterday);
    expect(todayBin?.count).toBe(2);
    expect(yesterdayBin?.count).toBe(1);
  });

  it("omits a workspace when its conclusions fetch fails (no thrown error)", async () => {
    mockListWorkspaces.mockResolvedValueOnce({ items: [ws], total: 1, page: 1, size: 50, pages: 1 });
    mockPost.mockRejectedValueOnce(new Error("Honcho 502"));
    const result = await getStats({ days: 7, include: "conclusions", workspaces: ["ws-1"] });
    // Promise.allSettled swallows the rejection; the workspace is excluded from results.
    expect(result.workspaces).toHaveLength(0);
    expect(result.grandTotal).toBe(0);
  });
});

describe("getStats (messages only)", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockListSessions.mockReset();
    mockListWorkspaces.mockReset();
  });

  it("counts messages across sessions", async () => {
    mockListWorkspaces.mockResolvedValueOnce({ items: [ws], total: 1, page: 1, size: 50, pages: 1 });
    const sessionsPage: Page<Session> = { items: [session], total: 1, page: 1, size: 200, pages: 1 };
    mockListSessions.mockResolvedValueOnce(sessionsPage);
    const today = new Date();
    const yyyy = today.toISOString().slice(0, 10);
    const msg = (id: string) => ({
      id, content: "hi", peer_id: "sam", session_id: "s-1",
      workspace_id: "ws-1", metadata: {}, created_at: yyyy, token_count: 1,
    });
    mockPost.mockResolvedValueOnce({
      items: [msg("m-1"), msg("m-2"), msg("m-3"), msg("m-4")],
      total: 4, page: 1, size: 200, pages: 1,
    });
    const result = await getStats({ days: 7, include: "messages", workspaces: ["ws-1"] });
    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0].total).toBe(4);
    const todayBin = result.workspaces[0].bins.find((b) => b.date === yyyy);
    expect(todayBin?.count).toBe(4);
  });
});
