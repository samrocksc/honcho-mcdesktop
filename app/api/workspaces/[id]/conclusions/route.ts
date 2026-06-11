import { NextRequest, NextResponse } from 'next/server'
import { listConclusions, queryConclusions } from '@/lib/honcho/conclusions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listConclusions(id, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { query } = await request.json() as { query: string }
  try {
    const data = await queryConclusions(id, query)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
