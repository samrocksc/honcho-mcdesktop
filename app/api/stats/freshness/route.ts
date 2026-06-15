import { NextResponse } from "next/server";
import { getRunbookFreshness } from "@/lib/honcho/analytics";

export async function GET() {
  try {
    const data = await getRunbookFreshness();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
