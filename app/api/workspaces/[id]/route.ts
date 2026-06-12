import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteWorkspace } from "@/lib/honcho/workspaces";

export async function DELETE(
  _request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteWorkspace(id);
    return new NextResponse(null, { status: 202 });
  } catch (err) {
    const msg = String(err);
    // 409 means the workspace has active sessions — surface that clearly
    const status = msg.includes("409") ? 409 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
