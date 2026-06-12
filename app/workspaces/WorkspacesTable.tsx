"use client";
import { useState } from "react";
import Link from "next/link";
import type { Workspace } from "@/lib/honcho/types";

type RowState =
  | { type: "idle" }
  | { type: "confirming-delete" }

type NewRowState =
  | { type: "hidden" }
  | { type: "editing"; value: string; saving: boolean; error: string }

export default function WorkspacesTable({ initialWorkspaces }: { readonly initialWorkspaces: readonly Workspace[] }) {
  const [workspaces, setWorkspaces] = useState<readonly Workspace[]>(initialWorkspaces);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [newRow, setNewRow] = useState<NewRowState>({ type: "hidden" });
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const setRowState = (id: string, state: RowState) =>
    setRowStates((prev) => ({ ...prev, [id]: state }));

  const getRowState = (id: string): RowState =>
    rowStates[id] ?? { type: "idle" };

  const handleCreate = async (id: string) => {
    if (newRow.type !== "editing") return;
    setNewRow({ ...newRow, saving: true, error: "" });
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setNewRow({ ...newRow, saving: false, error: error ?? "Create failed" });
        return;
      }
      const workspace = (await res.json()) as Workspace;
      setWorkspaces((prev) => [workspace, ...prev.filter((w) => w.id !== workspace.id)]);
      setNewRow({ type: "hidden" });
    } catch (e) {
      setNewRow({ ...newRow, saving: false, error: String(e) });
    }
  };

  const handleDelete = async (workspaceId: string) => {
    setDeleteErrors((prev) => ({ ...prev, [workspaceId]: "" }));
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        const msg = res.status === 409
          ? "Cannot delete: workspace has active sessions. Delete all sessions first."
          : (error ?? "Delete failed");
        setDeleteErrors((prev) => ({ ...prev, [workspaceId]: msg }));
        setRowState(workspaceId, { type: "idle" });
        return;
      }
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
      setRowStates((prev) => { const next = { ...prev }; delete next[workspaceId]; return next; });
    } catch (e) {
      setDeleteErrors((prev) => ({ ...prev, [workspaceId]: String(e) }));
      setRowState(workspaceId, { type: "idle" });
    }
  };

  return (
    <div className="card bg-base-100 shadow overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
        <span className="text-sm text-base-content/50">{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}</span>
        {newRow.type === "hidden" && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setNewRow({ type: "editing", value: "", saving: false, error: "" })}
          >
            + New Workspace
          </button>
        )}
      </div>

      <table className="table table-sm w-full">
        <thead>
          <tr className="border-b border-base-200">
            <th className="font-medium text-xs text-base-content/50 uppercase tracking-wide">ID</th>
            <th className="font-medium text-xs text-base-content/50 uppercase tracking-wide">Created</th>
            <th className="text-right font-medium text-xs text-base-content/50 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {newRow.type === "editing" && (
            <tr className="bg-base-200/40">
              <td colSpan={2} className="py-2">
                <div className="flex flex-col gap-1">
                  <input
                    autoFocus
                    className="input input-bordered input-sm w-full max-w-xs font-mono"
                    placeholder="workspace-id"
                    value={newRow.value}
                    onChange={(e) => setNewRow({ ...newRow, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate(newRow.value);
                      if (e.key === "Escape") setNewRow({ type: "hidden" });
                    }}
                    disabled={newRow.saving}
                  />
                  {newRow.error && <p className="text-xs text-error">{newRow.error}</p>}
                </div>
              </td>
              <td className="text-right py-2">
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleCreate(newRow.value)}
                    disabled={newRow.saving || !newRow.value.trim()}
                  >
                    {newRow.saving ? <span className="loading loading-spinner loading-xs" /> : "Create"}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setNewRow({ type: "hidden" })}
                    disabled={newRow.saving}
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          )}

          {workspaces.length === 0 && newRow.type === "hidden" && (
            <tr>
              <td colSpan={3} className="text-center text-base-content/40 text-sm py-8">
                No workspaces yet. Create one to get started.
              </td>
            </tr>
          )}

          {workspaces.map((ws) => {
            const state = getRowState(ws.id);
            const deleteError = deleteErrors[ws.id];
            return (
              <tr key={ws.id} className={state.type === "confirming-delete" ? "bg-error/5" : ""}>
                <td className="font-mono text-sm">
                  {state.type === "confirming-delete" ? (
                    <div>
                      <span className="font-semibold">{ws.id}</span>
                      <p className="text-xs text-error mt-0.5">
                        Delete this workspace and all its data? This cannot be undone.
                      </p>
                      {deleteError && <p className="text-xs text-error mt-0.5">{deleteError}</p>}
                    </div>
                  ) : (
                    <Link href={`/workspaces/${ws.id}`} className="link link-hover">
                      {ws.id}
                    </Link>
                  )}
                </td>
                <td className="text-xs text-base-content/40">
                  {new Date(ws.created_at).toLocaleDateString()}
                </td>
                <td className="text-right">
                  {state.type === "confirming-delete" ? (
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn btn-sm btn-error"
                        onClick={() => handleDelete(ws.id)}
                      >
                        Yes, delete
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setRowState(ws.id, { type: "idle" })}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm btn-ghost text-error"
                      onClick={() => setRowState(ws.id, { type: "confirming-delete" })}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
