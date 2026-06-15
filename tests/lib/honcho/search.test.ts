import { describe, it, expect, vi, beforeEach } from "vitest";
import { honchoPost } from "@/lib/honcho/client";
import { searchWorkspace } from "@/lib/honcho/search";

vi.mock("@/lib/honcho/client", () => ({ honchoPost: vi.fn() }));

const mockPost = vi.mocked(honchoPost);

describe("searchWorkspace", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/search", async () => {
    mockPost.mockResolvedValueOnce([{ id: "msg-1", content: "result" }]);
    await searchWorkspace("ws-1", "security tools");
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/search", { query: "security tools" });
  });
});
