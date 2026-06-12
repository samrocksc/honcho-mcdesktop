import { describe, it, expect, vi, beforeEach } from "vitest";
import { honchoPost } from "@/lib/honcho/client";
import { listConclusions, queryConclusions, createConclusions } from "@/lib/honcho/conclusions";
import type { Conclusion } from "@/lib/honcho/types";

vi.mock("@/lib/honcho/client", () => ({ honchoPost: vi.fn() }));

const mockPost = vi.mocked(honchoPost);
const conclusion: Conclusion = {
  id: "c-1", content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2", created_at: "2026-01-01T00:00:00Z"
};

describe("listConclusions", () => {
  beforeEach(() => mockPost.mockReset());
  it("calls POST /v3/workspaces/{id}/conclusions/list", async () => {
    mockPost.mockResolvedValueOnce({ items: [conclusion], total: 1, page: 1, size: 50, pages: 1 });
    await listConclusions("ws-1");
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/conclusions/list", { page: 1, size: 50, reverse: false });
  });
});

describe("queryConclusions", () => {
  beforeEach(() => mockPost.mockReset());

  it("puts observer_id and observed_id inside filters", async () => {
    mockPost.mockResolvedValueOnce([conclusion]);
    await queryConclusions("ws-1", {
      query: "expertise",
      observer_id: "sam",
      observed_id: "Hermes",
    });
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/conclusions/query", {
      query: "expertise",
      top_k: 10,
      distance: null,
      filters: { observer_id: "sam", observed_id: "Hermes" },
    });
  });

  it("merges custom filters with observer_id/observed_id", async () => {
    mockPost.mockResolvedValueOnce([]);
    await queryConclusions("ws-1", {
      query: "coffee",
      observer_id: "sam",
      observed_id: "sam",
      top_k: 5,
      distance: 0.8,
      filters: { source: "agent" },
    });
    expect(mockPost).toHaveBeenCalledWith("/v3/workspaces/ws-1/conclusions/query", {
      query: "coffee",
      top_k: 5,
      distance: 0.8,
      filters: { source: "agent", observer_id: "sam", observed_id: "sam" },
    });
  });
});

describe("createConclusions", () => {
  beforeEach(() => mockPost.mockReset());

  it("POSTs to /v3/workspaces/{id}/conclusions with batch body", async () => {
    mockPost.mockResolvedValueOnce([conclusion]);
    await createConclusions("ws-1", [
      { content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2" },
    ]);
    expect(mockPost).toHaveBeenCalledWith(
      "/v3/workspaces/ws-1/conclusions",
      { conclusions: [{ content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2" }] },
    );
  });

  it("returns the created conclusions array", async () => {
    mockPost.mockResolvedValueOnce([conclusion]);
    const result = await createConclusions("ws-1", [
      { content: "User is an expert.", observer_id: "peer-1", observed_id: "peer-2" },
    ]);
    expect(result).toEqual([conclusion]);
  });
});
