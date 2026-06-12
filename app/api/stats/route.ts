import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getStats } from "@/lib/honcho/analytics";

// Stats endpoint: returns volume-over-time data for all (or a subset of)
// workspaces, with a configurable time window and message/conclusion/both
// scope. Heavy on the Honcho backend when `messages` is included — the
// data layer pages through peers → sessions → messages for every
// workspace. Caching is left to the client (the page is read-only).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const daysParam = params.get("days");
  const include = (params.get("include") ?? "both") as "conclusions" | "messages" | "both";
  const workspacesParam = params.get("workspaces");
  const days = daysParam ? Math.max(1, Math.min(365, Number(daysParam) || 30)) : 30;
  const workspaces = workspacesParam ? workspacesParam.split(",").filter(Boolean) : undefined;

  if (!["conclusions", "messages", "both"].includes(include)) {
    return NextResponse.json(
      { error: "include must be 'conclusions', 'messages', or 'both'" },
      { status: 422 },
    );
  }

  try {
    const stats = await getStats({ days, include, workspaces });
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 502 },
    );
  }
}
