import { NextRequest, NextResponse } from 'next/server'
import { getPeer, getPeerRepresentation, getPeerContext } from '@/lib/honcho/peers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; peerId: string }> }
) {
  const { id, peerId } = await params
  try {
    const [peer, representation, context] = await Promise.allSettled([
      getPeer(id, peerId),
      getPeerRepresentation(id, peerId),
      getPeerContext(id, peerId),
    ])
    return NextResponse.json({
      peer: peer.status === 'fulfilled' ? peer.value : null,
      representation: representation.status === 'fulfilled' ? representation.value : null,
      context: context.status === 'fulfilled' ? context.value : null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
