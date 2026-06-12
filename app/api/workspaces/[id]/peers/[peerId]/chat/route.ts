import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { chatPeer } from "@/lib/honcho/peers";

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string; peerId: string }> }
) {
  const { id, peerId } = await params;
  const { query } = await request.json() as { query: string };
  try {
    const upstream = await chatPeer(id, peerId, query);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
