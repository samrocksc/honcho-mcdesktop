export const stripMarkdown = (content: string): string =>
  content
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^- \[[ xX]\] .*/gm, "")
    .split("\n")
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();

const MAX_CHARS = 6000;

export const chunkByHeading = (content: string, maxChars = MAX_CHARS): string[] => {
  if (content.length <= maxChars) return [content];
  const sections = content.split(/(?=^# )/m).filter(Boolean);
  if (sections.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += maxChars) {
      chunks.push(content.slice(i, i + maxChars));
    }
    return chunks;
  }
  const chunks: string[] = [];
  let current = "";
  for (const section of sections) {
    if ((current + section).length > maxChars && current) {
      chunks.push(current.trim());
      current = section;
    } else {
      current += section;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

export const DEFAULT_GUIDANCE =
  "Extract atomic, persistent conclusions about engineering preferences, active projects, " +
  "tooling decisions, and recurring patterns. Ignore meeting logistics, tasks, and one-off notes.";

export const buildExtractionPrompt = (content: string, guidance: string): string => `
Extract conclusions from the following notes.

Rules:
- Return ONLY a JSON array of strings, nothing else — no prose, no markdown fences.
- Each string must be a single, atomic, declarative sentence in the present tense.
- Focus: ${guidance || DEFAULT_GUIDANCE}

Notes:
${content}
`.trim();

export const parseConclusions = (raw: string): string[] => {
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};
