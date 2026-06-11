import { NextRequest, NextResponse } from 'next/server'
import { listPeerSessions } from '@/lib/honcho/peers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; peerId: string }> }
) {
  const { id, peerId } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listPeerSessions(id, peerId, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
