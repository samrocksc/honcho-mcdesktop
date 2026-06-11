import { NextRequest, NextResponse } from 'next/server'
import { listSessions } from '@/lib/honcho/sessions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listSessions(id, { page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
