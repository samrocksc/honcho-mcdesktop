import { NextResponse } from "next/server";
import { getCrossWorkspaceCoverage } from "@/lib/honcho/analytics";

export async function GET() {
  try {
    const data = await getCrossWorkspaceCoverage();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
