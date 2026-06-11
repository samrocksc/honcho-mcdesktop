import { NextRequest, NextResponse } from 'next/server'
import { listWorkspaces } from '@/lib/honcho/workspaces'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const size = Number(searchParams.get('size') ?? '50')
  try {
    const data = await listWorkspaces({ page, size })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
