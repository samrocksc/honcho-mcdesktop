import { describe, it, expect, vi, beforeEach } from "vitest";
import { honchoPost, honchoGet } from "@/lib/honcho/client";
import { listSessions, getSession, listMessages } from "@/lib/honcho/sessions";
import type { Session, Message } from "@/lib/honcho/types";

vi.mock("@/lib/honcho/client", () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
}));

const mockPost = vi.mocked(honchoPost);
const mockGet = vi.mocked(honchoGet);

const session: Session = { id: "sess-1", is_active: true, workspace_id: "ws-1", created_at: "2026-01-01T00:00:00Z" };
const message: Message = {
  id: "msg-1", content: "Hello", peer_id: "peer-1", session_id: "sess-1",
  workspace_id: "ws-1", created_at: "2026-01-01T00:00:00Z", token_count: 5,
};

describe("listSessions", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/sessions/list", async () => {
    mockPost.mockResolvedValueOnce({ items: [session], total: 1, page: 1, size: 50, pages: 1 });
    await listSessions("ws-1");
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/sessions/list", { page: 1, size: 50, reverse: false });
  });
});

describe("listMessages", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/sessions/{sessionId}/messages/list", async () => {
    mockPost.mockResolvedValueOnce({ items: [message], total: 1, page: 1, size: 50, pages: 1 });
    await listMessages("ws-1", "sess-1");
    expect(mockPost).toHaveBeenCalledWith(
      "/v3/workspaces/ws-1/sessions/sess-1/messages/list",
      { page: 1, size: 50, reverse: false }
    );
  });
});

describe("getSession", () => {
  beforeEach(() => mockGet.mockReset());
  it("calls GET for a single session", async () => {
    mockGet.mockResolvedValueOnce(session);
    await getSession("ws-1", "sess-1");
    expect(mockGet).toHaveBeenCalledWith("/v3/workspaces/ws-1/sessions/sess-1");
  });
});
