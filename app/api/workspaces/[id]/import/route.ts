import type { NextRequest } from "next/server";
import { askPeer } from "@/lib/honcho/peers";
import { createConclusions } from "@/lib/honcho/conclusions";
import { stripMarkdown, chunkByHeading, buildExtractionPrompt, parseConclusions } from "@/lib/honcho/import";

export const maxDuration = 300;

type ImportFile = {
  readonly name: string
  readonly content: string
}

type ImportBody = {
  readonly files: readonly ImportFile[]
  readonly observer_id: string
  readonly observed_id: string
  readonly guidance: string
}

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as ImportBody;
  const { files, observer_id, observed_id, guidance } = body;

  if (!Array.isArray(files) || typeof observer_id !== "string" || typeof observed_id !== "string") {
    return new Response(JSON.stringify({ error: "files, observer_id, and observed_id are required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      let totalConclusions = 0;
      let totalErrors = 0;

      for (const file of files) {
        try {
          const stripped = stripMarkdown(file.content);
          const chunks = chunkByHeading(stripped);
          const allConclusions: string[] = [];

          for (const chunk of chunks) {
            const prompt = buildExtractionPrompt(chunk, guidance);
            const response = await Promise.race([
              askPeer(id, observer_id, { query: prompt, reasoning_level: "low" }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("askPeer timeout")), 30_000)
              ),
            ]);
            const parsed = parseConclusions(response.content ?? "");
            allConclusions.push(...parsed);
          }

          for (const content of allConclusions) {
            send({ type: "extracted", content, filename: file.name });
          }

          if (allConclusions.length === 0) {
            send({ type: "batch_error", filename: file.name, error: "No conclusions extracted" });
            totalErrors++;
            continue;
          }

          send({ type: "writing", filename: file.name, count: allConclusions.length });

          const items = allConclusions.map((content) => ({ content, observer_id, observed_id }));
          for (let i = 0; i < items.length; i += 100) {
            await createConclusions(id, items.slice(i, i + 100));
          }

          send({ type: "batch_confirmed", filename: file.name, count: allConclusions.length });
          totalConclusions += allConclusions.length;
        } catch (err) {
          send({ type: "batch_error", filename: file.name, error: String(err) });
          totalErrors++;
        }
      }

      send({ type: "done", total_files: files.length, total_conclusions: totalConclusions, total_errors: totalErrors });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "X-Content-Type-Options": "nosniff" },
  });
}
