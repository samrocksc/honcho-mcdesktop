import Link from "next/link";
import { listPeers } from "@/lib/honcho/peers";
import type { Peer } from "@/lib/honcho/types";
import ImportPanel from "./ImportPanel";

type Props = {
  readonly params: Promise<{ workspaceId: string }>
  readonly searchParams: Promise<{ observed_id?: string }>
}

export default async function ImportPage({ params, searchParams }: Props) {
  const { workspaceId } = await params;
  const { observed_id } = await searchParams;

  const peers: readonly Peer[] = await listPeers(workspaceId)
    .then((r) => r.items)
    .catch((): readonly Peer[] => []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← Workspace</Link>
        <h1 className="text-xl font-bold font-mono truncate">{workspaceId}</h1>
        <span className="badge badge-neutral">Import</span>
      </div>
      <ImportPanel workspaceId={workspaceId} peers={peers} initialObservedId={observed_id} />
    </div>
  );
}
