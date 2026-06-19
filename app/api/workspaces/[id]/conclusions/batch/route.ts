import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createConclusions } from "@/lib/honcho/conclusions";

type BatchItem = {
  readonly content: string
  readonly observer_id: string
  readonly observed_id: string
}

type BatchBody = {
  readonly conclusions: readonly BatchItem[]
}

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as BatchBody;
  if (!Array.isArray(body.conclusions) || body.conclusions.length === 0) {
    return NextResponse.json({ error: "conclusions array is required" }, { status: 422 });
  }
  try {
    const result = await createConclusions(id, body.conclusions);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
