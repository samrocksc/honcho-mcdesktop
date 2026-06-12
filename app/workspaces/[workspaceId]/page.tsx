import Link from "next/link";
import { listPeers } from "@/lib/honcho/peers";
import { listSessions } from "@/lib/honcho/sessions";
import { listConclusions } from "@/lib/honcho/conclusions";
import type { Peer, Session, Conclusion } from "@/lib/honcho/types";
import WorkspaceTabs from "./WorkspaceTabs";

type Props = {
  readonly params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceDetailPage({ params }: Props) {
  const { workspaceId } = await params;

  const [peersResult, sessionsResult, conclusionsResult] = await Promise.allSettled([
    listPeers(workspaceId),
    listSessions(workspaceId),
    listConclusions(workspaceId),
  ]);

  const peers: readonly Peer[] = peersResult.status === "fulfilled" ? peersResult.value.items : [];
  const sessions: readonly Session[] = sessionsResult.status === "fulfilled" ? sessionsResult.value.items : [];
  const conclusions: readonly Conclusion[] = conclusionsResult.status === "fulfilled" ? conclusionsResult.value.items : [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <h1 className="text-xl font-bold font-mono truncate">{workspaceId}</h1>
        <Link href={`/workspaces/${workspaceId}/import`} className="btn btn-sm btn-outline ml-auto">
          Import
        </Link>
      </div>
      <WorkspaceTabs
        workspaceId={workspaceId}
        peers={peers}
        sessions={sessions}
        conclusions={conclusions}
      />
    </div>
  );
}
