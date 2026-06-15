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

export const chunkByHeading = (content: string, maxChars = MAX_CHARS): readonly string[] => {
  if (content.length <= maxChars) return [content];
  const sections = content.split(/(?=^# )/m).filter(Boolean);
  if (sections.length <= 1) {
    return Array.from(
      { length: Math.ceil(content.length / maxChars) },
      (_, i) => content.slice(i * maxChars, (i + 1) * maxChars),
    );
  }
  const { chunks, current } = sections.reduce(
    ({ chunks: acc, current: cur }, section) =>
      (cur + section).length > maxChars && cur
        ? { chunks: [...acc, cur.trim()], current: section }
        : { chunks: acc, current: cur + section },
    { chunks: [] as string[], current: "" },
  );
  return current.trim() ? [...chunks, current.trim()] : chunks;
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
