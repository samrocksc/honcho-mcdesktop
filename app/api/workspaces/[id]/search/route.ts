import { NextRequest, NextResponse } from 'next/server'
import { searchWorkspace } from '@/lib/honcho/search'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { query } = await request.json() as { query: string }
  try {
    const data = await searchWorkspace(id, query)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
