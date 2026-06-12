import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { listConclusions, queryConclusions, type ConclusionQueryParams } from "@/lib/honcho/conclusions";

export async function GET(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "50");
  try {
    const data = await listConclusions(id, { page, size });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

type SemanticSearchBody = {
  readonly query?: string
  readonly observer_id?: string
  readonly observed_id?: string
  readonly top_k?: number
  readonly distance?: number | null
  readonly filters?: Readonly<Record<string, unknown>> | null
}

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as SemanticSearchBody;
  const { query, observer_id, observed_id } = body;
  if (typeof query !== "string" || typeof observer_id !== "string" || typeof observed_id !== "string") {
    // Surface the underlying Honcho error in the response so the UI can
    // show a specific message instead of "Search failed". (Tracked in
    // tickets/0002.)
    return NextResponse.json(
      { error: "observer_id and observed_id are required for semantic search" },
      { status: 422 },
    );
  }
  const queryParams: ConclusionQueryParams = {
    query,
    observer_id,
    observed_id,
    top_k: body.top_k,
    distance: body.distance,
    filters: body.filters,
  };
  try {
    const data = await queryConclusions(id, queryParams);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
