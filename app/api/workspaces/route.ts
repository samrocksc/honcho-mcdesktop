import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { listWorkspaces, createWorkspace } from "@/lib/honcho/workspaces";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "50");
  try {
    const data = await listWorkspaces({ page, size });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id } = (await request.json()) as { id: string };
    if (!id?.trim()) return NextResponse.json({ error: "id is required" }, { status: 422 });
    const data = await createWorkspace(id.trim());
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
