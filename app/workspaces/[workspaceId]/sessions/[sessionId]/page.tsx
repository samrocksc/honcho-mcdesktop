import Link from 'next/link'
import { listMessages } from '@/lib/honcho/sessions'
import type { Message } from '@/lib/honcho/types'

interface Props {
  readonly params: Promise<{ workspaceId: string; sessionId: string }>
}

export default async function SessionDetailPage({ params }: Props) {
  const { workspaceId, sessionId } = await params

  let messages: readonly Message[] = []
  let error: string | null = null

  try {
    const page = await listMessages(workspaceId, sessionId)
    messages = page.items
  } catch (e) {
    error = String(e)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← {workspaceId}</Link>
        <h1 className="text-lg font-bold font-mono truncate">{sessionId}</h1>
        {messages.length > 0 && <span className="badge badge-neutral">{messages.length} messages</span>}
      </div>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      <MessageThread messages={messages} />
    </div>
  )
}

function MessageThread({ messages }: { readonly messages: readonly Message[] }) {
  if (messages.length === 0) {
    return <p className="text-base-content/50 text-sm">No messages in this session.</p>
  }
  return (
    <div className="space-y-3">
      {messages.map((msg) => <MessageCard key={msg.id} message={msg} />)}
    </div>
  )
}

function MessageCard({ message }: { readonly message: Message }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body py-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="badge badge-outline badge-sm font-mono">{message.peer_id}</span>
          <span className="text-xs text-base-content/40">
            {new Date(message.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.token_count > 0 && (
          <p className="text-xs text-base-content/30 mt-1">{message.token_count} tokens</p>
        )}
      </div>
    </div>
  )
}
