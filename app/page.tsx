import Link from "next/link";
import { listWorkspaces } from "@/lib/honcho/workspaces";
import type { Workspace } from "@/lib/honcho/types";

export default async function HomePage() {
  const { workspaces, total, error } = await listWorkspaces()
    .then((page) => ({ workspaces: page.items as readonly Workspace[], total: page.total, error: null as string | null }))
    .catch((e: unknown) => ({ workspaces: [] as readonly Workspace[], total: 0, error: String(e) as string | null }));

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

      <div className="flex flex-col gap-2">
        {workspaces.map((ws) => (
          <WorkspaceRow key={ws.id} workspace={ws} />
        ))}
      </div>
    </div>
  );
}

function WorkspaceRow({ workspace }: { readonly workspace: Workspace }) {
  return (
    <Link href={`/workspaces/${workspace.id}`}>
      <div className="card bg-base-100 shadow-sm hover:shadow transition-shadow cursor-pointer">
        <div className="card-body py-3 px-4 flex-row items-center justify-between">
          <h2 className="font-mono text-sm font-medium">{workspace.id}</h2>
          <p className="text-xs text-base-content/40">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  );
}
