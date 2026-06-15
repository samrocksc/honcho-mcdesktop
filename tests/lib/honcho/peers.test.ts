import { describe, it, expect, vi, beforeEach } from "vitest";
import { honchoPost, honchoGet, honchoPostStream } from "@/lib/honcho/client";
import {
  listPeers,
  getPeer,
  getPeerRepresentation,
  getPeerContext,
  getPeerCard,
  askPeer,
  chatPeer,
  listPeerSessions,
  searchPeerMessages,
} from "@/lib/honcho/peers";
import type { Page, Peer, RepresentationResponse, Message } from "@/lib/honcho/types";

vi.mock("@/lib/honcho/client", () => ({
  honchoPost: vi.fn(),
  honchoGet: vi.fn(),
  honchoPostStream: vi.fn(),
}));

const mockPost = vi.mocked(honchoPost);
const mockGet = vi.mocked(honchoGet);
const mockStream = vi.mocked(honchoPostStream);

const peer: Peer = { id: "peer-1", workspace_id: "ws-1", metadata: {}, created_at: "2026-01-01T00:00:00Z" };

describe("listPeers", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/peers/list", async () => {
    const page: Page<Peer> = { items: [peer], total: 1, page: 1, size: 50, pages: 1 };
    mockPost.mockResolvedValueOnce(page);
    await listPeers("ws-1");
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/list", { page: 1, size: 50, reverse: false });
  });
});

describe("getPeer", () => {
  beforeEach(() => mockGet.mockReset());
  it("calls GET /v3/workspaces/{id}/peers/{peerId}", async () => {
    mockGet.mockResolvedValueOnce(peer);
    await getPeer("ws-1", "peer-1");
    expect(mockGet).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1");
  });
});

describe("getPeerRepresentation", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/peers/{peerId}/representation", async () => {
    const rep: RepresentationResponse = { representation: "This peer likes brevity." };
    mockPost.mockResolvedValueOnce(rep);
    const result = await getPeerRepresentation("ws-1", "peer-1");
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1/representation", {});
    expect(result.representation).toBe("This peer likes brevity.");
  });
});

describe("getPeerContext", () => {
  beforeEach(() => mockGet.mockReset());
  it("calls GET /v3/workspaces/{id}/peers/{peerId}/context", async () => {
    const ctx = { peer_id: "peer-1", target_id: "peer-1", representation: "Some rep", peer_card: null };
    mockGet.mockResolvedValueOnce(ctx);
    await getPeerContext("ws-1", "peer-1");
    expect(mockGet).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1/context");
  });
});

describe("getPeerCard", () => {
  beforeEach(() => mockGet.mockReset());
  it("calls GET /peers/{id}/card with no target by default", async () => {
    mockGet.mockResolvedValueOnce({ peer_card: ["Name: Sam"] });
    const result = await getPeerCard("ws-1", "peer-1");
    expect(mockGet).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1/card");
    expect(result.peer_card).toEqual(["Name: Sam"]);
  });
  it("appends ?target=... when a target peer is provided", async () => {
    mockGet.mockResolvedValueOnce({ peer_card: ["Knows: Sam"] });
    await getPeerCard("ws-1", "observer", "sam");
    expect(mockGet).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/observer/card?target=sam");
  });
});

describe("askPeer (dialectic)", () => {
  beforeEach(() => mockPost.mockReset());
  it("sends DialecticOptions with defaults (reasoning_level=low, stream=false)", async () => {
    mockPost.mockResolvedValueOnce({ content: "An answer." });
    await askPeer("ws-1", "peer-1", { query: "What do you know?" });
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1/chat", {
      query: "What do you know?",
      target: null,
      session_id: null,
      reasoning_level: "low",
      stream: false,
    });
  });
  it("forwards reasoning_level, target, and session_id when provided", async () => {
    mockPost.mockResolvedValueOnce({ content: "Other-perspective answer." });
    await askPeer("ws-1", "observer", {
      query: "How does observer see target?",
      target: "target",
      session_id: "sess-42",
      reasoning_level: "high",
    });
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/observer/chat", {
      query: "How does observer see target?",
      target: "target",
      session_id: "sess-42",
      reasoning_level: "high",
      stream: false,
    });
  });
});

describe("chatPeer (streaming)", () => {
  beforeEach(() => mockStream.mockReset());
  it("calls POST stream for peer chat with the legacy {query} shape", async () => {
    const fakeResponse = { ok: true, body: null } as unknown as Response;
    mockStream.mockResolvedValueOnce(fakeResponse);
    const result = await chatPeer("ws-1", "peer-1", "What do you know?");
    expect(mockStream).toHaveBeenCalledWith(
      "/v3/workspaces/ws-1/peers/peer-1/chat",
      { query: "What do you know?" },
    );
    expect(result).toBe(fakeResponse);
  });
});

describe("listPeerSessions", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/peers/{peerId}/sessions", async () => {
    mockPost.mockResolvedValueOnce({ items: [], total: 0, page: 1, size: 50, pages: 0 });
    await listPeerSessions("ws-1", "peer-1");
    expect(mockPost).toHaveBeenCalledWith(
      "/v3/workspaces/ws-1/peers/peer-1/sessions/list",
      { page: 1, size: 50, reverse: false },
    );
  });
});

describe("searchPeerMessages", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /peers/{peerId}/search with default limit", async () => {
    const msg: Message = {
      id: "m-1", content: "hi", peer_id: "peer-1", session_id: "s-1",
      workspace_id: "ws-1", metadata: {}, created_at: "2026-01-01T00:00:00Z", token_count: 1,
    };
    mockPost.mockResolvedValueOnce([msg]);
    await searchPeerMessages("ws-1", "peer-1", { query: "greeting" });
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1/search", {
      query: "greeting",
      limit: 10,
      filters: null,
    });
  });
  it("passes through custom limit and filters", async () => {
    mockPost.mockResolvedValueOnce([]);
    await searchPeerMessages("ws-1", "peer-1", { query: "x", limit: 3, filters: { source: "agent" } });
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/peers/peer-1/search", {
      query: "x",
      limit: 3,
      filters: { source: "agent" },
    });
  });
});
