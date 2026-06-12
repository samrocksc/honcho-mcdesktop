import { describe, it, expect } from "vitest";
import { getDoc } from "@/lib/docs";

describe("getDoc", () => {
  it("matches /stats", () => {
    expect(getDoc("/stats").title).toBe("Stats");
  });

  it("matches /diagnose", () => {
    expect(getDoc("/diagnose").title).toBe("Diagnose");
  });

  it("matches workspace list /", () => {
    expect(getDoc("/").title).toBe("Workspaces");
  });

  it("matches workspace detail", () => {
    expect(getDoc("/workspaces/the-sewer").title).toBe("Workspace");
  });

  it("matches peer detail before workspace detail", () => {
    expect(getDoc("/workspaces/the-sewer/peers/sam").title).toBe("Peer");
  });

  it("matches session detail before workspace detail", () => {
    expect(getDoc("/workspaces/the-sewer/sessions/sess-1").title).toBe("Session");
  });

  it("returns fallback for unknown routes", () => {
    expect(getDoc("/unknown/route").title).toBe("Honcho Helpdesk");
  });
});
