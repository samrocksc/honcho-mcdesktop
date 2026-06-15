import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getConsolidatedStats } from "@/lib/honcho/analytics";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const daysParam = params.get("days");
  const include = (params.get("include") ?? "conclusions") as "conclusions" | "messages" | "both";
  const days = daysParam ? Math.max(1, Math.min(365, Number(daysParam) || 30)) : 30;

  if (!["conclusions", "messages", "both"].includes(include)) {
    return NextResponse.json(
      { error: "include must be 'conclusions', 'messages', or 'both'" },
      { status: 422 },
    );
  }

  try {
    const data = await getConsolidatedStats({ days, include });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
