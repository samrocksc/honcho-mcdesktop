import { type NextRequest, NextResponse } from "next/server";
import { getPeerActivity } from "@/lib/honcho/analytics";

export async function GET(request: NextRequest) {
  const days = Math.max(1, Math.min(90, Number(request.nextUrl.searchParams.get("days") || 30) || 30));
  try {
    const data = await getPeerActivity(days);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
