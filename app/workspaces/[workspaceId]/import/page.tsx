import Link from "next/link";
import { listPeers } from "@/lib/honcho/peers";
import type { Peer } from "@/lib/honcho/types";
import ImportPanel from "./ImportPanel";

type Props = {
  readonly params: Promise<{ workspaceId: string }>
}

export default async function ImportPage({ params }: Props) {
  const { workspaceId } = await params;

  let peers: readonly Peer[] = [];
  try {
    const result = await listPeers(workspaceId);
    peers = result.items;
  } catch {}

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← Workspace</Link>
        <h1 className="text-xl font-bold font-mono truncate">{workspaceId}</h1>
        <span className="badge badge-neutral">Import</span>
      </div>
      <ImportPanel workspaceId={workspaceId} peers={peers} />
    </div>
  );
}
