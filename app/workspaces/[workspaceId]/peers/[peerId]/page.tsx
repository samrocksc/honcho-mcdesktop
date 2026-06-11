import Link from 'next/link'
import { getPeer, getPeerRepresentation, getPeerContext, listPeerSessions } from '@/lib/honcho/peers'
import type { Peer, RepresentationResponse, PeerContext, Session } from '@/lib/honcho/types'
import PeerDetail from './PeerDetail'

interface Props {
  readonly params: Promise<{ workspaceId: string; peerId: string }>
}

export default async function PeerDetailPage({ params }: Props) {
  const { workspaceId, peerId } = await params

  const [peerResult, repResult, contextResult, sessionsResult] = await Promise.allSettled([
    getPeer(workspaceId, peerId),
    getPeerRepresentation(workspaceId, peerId),
    getPeerContext(workspaceId, peerId),
    listPeerSessions(workspaceId, peerId),
  ])

  const peer: Peer | null = peerResult.status === 'fulfilled' ? peerResult.value : null
  const representation: RepresentationResponse | null = repResult.status === 'fulfilled' ? repResult.value : null
  const context: PeerContext | null = contextResult.status === 'fulfilled' ? contextResult.value : null
  const sessions: readonly Session[] = sessionsResult.status === 'fulfilled' ? sessionsResult.value.items : []

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← {workspaceId}</Link>
        <h1 className="text-lg font-bold font-mono truncate">{peerId}</h1>
      </div>
      <PeerDetail
        peer={peer}
        representation={representation}
        context={context}
        sessions={sessions}
        workspaceId={workspaceId}
      />
    </div>
  )
}
