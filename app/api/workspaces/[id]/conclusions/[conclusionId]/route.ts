import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteConclusion } from "@/lib/honcho/conclusions";

export async function DELETE(
  _request: NextRequest,
  { params }: { readonly params: Promise<{ id: string; conclusionId: string }> }
) {
  const { id, conclusionId } = await params;
  try {
    await deleteConclusion(id, conclusionId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
