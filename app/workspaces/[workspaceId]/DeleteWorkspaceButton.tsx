"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteWorkspaceButton({ workspaceId }: { readonly workspaceId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error: msg } = (await res.json()) as { error: string };
        setError(res.status === 409
          ? "Cannot delete: workspace has active sessions. Delete all sessions first."
          : (msg ?? "Delete failed"));
        setConfirming(false);
        setDeleting(false);
        return;
      }
      router.push("/");
    } catch (e) {
      setError(String(e));
      setConfirming(false);
      setDeleting(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-error">Delete this workspace and all its data?</span>
        <button className="btn btn-xs btn-error" onClick={handleDelete} disabled={deleting}>
          {deleting ? <span className="loading loading-spinner loading-xs" /> : "Yes, delete"}
        </button>
        <button className="btn btn-xs btn-ghost" onClick={() => setConfirming(false)} disabled={deleting}>
          Cancel
        </button>
        {error && <span className="text-xs text-error w-full">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn btn-sm btn-ghost text-error" onClick={() => setConfirming(true)}>
        Delete workspace
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
