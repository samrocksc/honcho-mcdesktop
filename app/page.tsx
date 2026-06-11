import Link from 'next/link'
import { listWorkspaces } from '@/lib/honcho/workspaces'
import type { Workspace } from '@/lib/honcho/types'

export default async function HomePage() {
  let workspaces: readonly Workspace[] = []
  let total = 0
  let error: string | null = null

  try {
    const page = await listWorkspaces()
    workspaces = page.items
    total = page.total
  } catch (e) {
    error = String(e)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        {total > 0 && <span className="badge badge-neutral">{total} total</span>}
      </div>

      {error && (
        <div className="alert alert-error">
          <span>Could not connect to Honcho: {error}</span>
        </div>
      )}

      {!error && workspaces.length === 0 && (
        <div className="alert alert-info"><span>No workspaces found.</span></div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <WorkspaceCard key={ws.id} workspace={ws} />
        ))}
      </div>
    </div>
  )
}

function WorkspaceCard({ workspace }: { readonly workspace: Workspace }) {
  return (
    <Link href={`/workspaces/${workspace.id}`}>
      <div className="card bg-base-100 shadow hover:shadow-md transition-shadow cursor-pointer">
        <div className="card-body">
          <h2 className="card-title text-base font-mono truncate">{workspace.id}</h2>
          <p className="text-xs text-base-content/40">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  )
}
