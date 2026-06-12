import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { listPeers, createPeer } from "@/lib/honcho/peers";

export async function GET(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "50");
  try {
    const data = await listPeers(id, { page, size });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { peer_id } = (await request.json()) as { peer_id: string };
    if (!peer_id?.trim()) return NextResponse.json({ error: "peer_id is required" }, { status: 422 });
    const data = await createPeer(id, peer_id.trim());
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
