import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { askPeer } from "@/lib/honcho/peers";

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string; peerId: string }> }
) {
  const { id, peerId } = await params;
  const { query, reasoning_level } = await request.json() as { query: string; reasoning_level?: string };
  try {
    const result = await askPeer(id, peerId, {
      query,
      reasoning_level: (reasoning_level ?? "low") as "low" | "medium" | "high",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
