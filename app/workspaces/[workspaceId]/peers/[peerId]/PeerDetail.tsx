import Link from 'next/link'
import type { Peer, RepresentationResponse, PeerContext, Session } from '@/lib/honcho/types'

interface Props {
  readonly peer: Peer | null
  readonly representation: RepresentationResponse | null
  readonly context: PeerContext | null
  readonly sessions: readonly Session[]
  readonly workspaceId: string
}

export default function PeerDetail({ peer, representation, context, sessions, workspaceId }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <LeftPanel peer={peer} representation={representation} context={context} />
      <RightPanel sessions={sessions} workspaceId={workspaceId} />
    </div>
  )
}

function LeftPanel({ peer, representation, context }: {
  readonly peer: Peer | null
  readonly representation: RepresentationResponse | null
  readonly context: PeerContext | null
}) {
  return (
    <div className="lg:w-1/2 space-y-4">
      {representation?.representation && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-base">Representation</h3>
            <p className="text-sm whitespace-pre-wrap text-base-content/80">{representation.representation}</p>
          </div>
        </div>
      )}

      {context && (context.representation || context.peer_card) && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-base">Context</h3>
            {context.representation && (
              <p className="text-sm text-base-content/80 mb-2">{context.representation}</p>
            )}
            {context.peer_card && context.peer_card.length > 0 && (
              <ul className="list-disc list-inside text-sm text-base-content/70 space-y-1">
                {context.peer_card.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {peer?.metadata && Object.keys(peer.metadata).length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-base">Metadata</h3>
            <pre className="text-xs overflow-auto bg-base-200 rounded p-2">
              {JSON.stringify(peer.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!representation && !context && !peer && (
        <p className="text-base-content/50 text-sm">No peer data available.</p>
      )}
    </div>
  )
}

function RightPanel({ sessions, workspaceId }: { readonly sessions: readonly Session[]; readonly workspaceId: string }) {
  return (
    <div className="lg:w-1/2">
      <h3 className="font-semibold mb-3">Sessions ({sessions.length})</h3>
      {sessions.length === 0
        ? <p className="text-base-content/50 text-sm">No sessions found.</p>
        : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link key={session.id} href={`/workspaces/${workspaceId}/sessions/${session.id}`} className="block">
                <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow">
                  <div className="card-body py-3 px-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm font-medium">{session.id}</p>
                      {!session.is_active && <span className="badge badge-sm badge-ghost">inactive</span>}
                    </div>
                    <p className="text-xs text-base-content/40">
                      Created {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      }
    </div>
  )
}
