import { describe, it, expect } from "vitest";
import {
  stripMarkdown,
  chunkByHeading,
  buildExtractionPrompt,
  parseConclusions,
} from "@/lib/honcho/import";

describe("stripMarkdown", () => {
  it("replaces [[wikilink]] with the link text", () => {
    expect(stripMarkdown("See [[MyPage]] for details.")).toBe("See MyPage for details.");
  });

  it("uses the display text when a pipe alias is present", () => {
    expect(stripMarkdown("See [[MyPage|My Page]] for details.")).toBe("See My Page for details.");
  });

  it("removes ![[embed]] entirely", () => {
    expect(stripMarkdown("Before ![[image.png]] after.")).toBe("Before  after.");
  });

  it("removes unchecked task lines", () => {
    expect(stripMarkdown("- [ ] Do the thing\nKeep this.")).toBe("Keep this.");
  });

  it("removes checked task lines", () => {
    expect(stripMarkdown("- [x] Done\nKeep this.")).toBe("Keep this.");
  });

  it("leaves normal content untouched", () => {
    expect(stripMarkdown("# Heading\n\nNormal paragraph.")).toBe("# Heading\n\nNormal paragraph.");
  });
});

describe("chunkByHeading", () => {
  it("returns the whole content as one chunk if under maxChars", () => {
    const content = "# Section\n\nSome text.";
    expect(chunkByHeading(content, 1000)).toEqual([content]);
  });

  it("splits on top-level headings when content exceeds maxChars", () => {
    const content = "# A\n\nshort\n# B\n\nshort";
    const chunks = chunkByHeading(content, 10);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain("# A");
    expect(chunks[1]).toContain("# B");
  });
});

describe("buildExtractionPrompt", () => {
  it("includes the guidance and content in the returned string", () => {
    const prompt = buildExtractionPrompt("some notes", "focus on tools");
    expect(prompt).toContain("focus on tools");
    expect(prompt).toContain("some notes");
    expect(prompt).toContain("JSON array");
  });
});

describe("parseConclusions", () => {
  it("parses a JSON array of strings", () => {
    const raw = '["User prefers X.", "User avoids Y."]';
    expect(parseConclusions(raw)).toEqual(["User prefers X.", "User avoids Y."]);
  });

  it("extracts a JSON array embedded in prose", () => {
    const raw = 'Here are the conclusions:\n["Conclusion A.", "Conclusion B."]\nDone.';
    expect(parseConclusions(raw)).toEqual(["Conclusion A.", "Conclusion B."]);
  });

  it("returns an empty array when no valid JSON array is found", () => {
    expect(parseConclusions("No conclusions here.")).toEqual([]);
  });

  it("returns an empty array when JSON is an object, not an array", () => {
    expect(parseConclusions('{"key": "value"}')).toEqual([]);
  });
});
