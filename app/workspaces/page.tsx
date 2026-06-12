import { listWorkspaces } from "@/lib/honcho/workspaces";
import type { Workspace } from "@/lib/honcho/types";
import WorkspacesTable from "./WorkspacesTable";

export default async function WorkspacesManagePage() {
  const { workspaces, error } = await listWorkspaces({ size: 100 })
    .then((p) => ({ workspaces: p.items as readonly Workspace[], error: null as string | null }))
    .catch((e: unknown) => ({ workspaces: [] as readonly Workspace[], error: String(e) }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manage Workspaces</h1>
        <p className="text-sm text-base-content/50 mt-1">
          Create and delete Honcho workspaces. Workspace IDs are permanent — they cannot be renamed after creation.
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>Could not connect to Honcho: {error}</span>
        </div>
      )}

      <WorkspacesTable initialWorkspaces={workspaces} />
    </div>
  );
}
