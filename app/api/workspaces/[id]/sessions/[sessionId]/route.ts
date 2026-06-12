import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/honcho/sessions";

export async function DELETE(
  _request: NextRequest,
  { params }: { readonly params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  try {
    await deleteSession(id, sessionId);
    return new NextResponse(null, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
