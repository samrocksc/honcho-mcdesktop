import Link from "next/link";
import { getPeer, getPeerRepresentation, getPeerContext, listPeerSessions } from "@/lib/honcho/peers";
import { listConclusions } from "@/lib/honcho/conclusions";
import type { Peer, RepresentationResponse, PeerContext, Session, Conclusion } from "@/lib/honcho/types";
import PeerDetail from "./PeerDetail";

type Props = {
  readonly params: Promise<{ workspaceId: string; peerId: string }>
}

export default async function PeerDetailPage({ params }: Props) {
  const { workspaceId, peerId } = await params;

  const [peerResult, repResult, contextResult, sessionsResult, conclusionsResult] = await Promise.allSettled([
    getPeer(workspaceId, peerId),
    getPeerRepresentation(workspaceId, peerId),
    getPeerContext(workspaceId, peerId),
    listPeerSessions(workspaceId, peerId),
    listConclusions(workspaceId),
  ]);

  const peer: Peer | null = peerResult.status === "fulfilled" ? peerResult.value : null;
  const representation: RepresentationResponse | null = repResult.status === "fulfilled" ? repResult.value : null;
  const context: PeerContext | null = contextResult.status === "fulfilled" ? contextResult.value : null;
  const sessions: readonly Session[] = sessionsResult.status === "fulfilled" ? sessionsResult.value.items : [];
  const allConclusions: readonly Conclusion[] = conclusionsResult.status === "fulfilled" ? conclusionsResult.value.items : [];
  const conclusions = allConclusions.filter((c) => c.observed_id === peerId || c.observer_id === peerId);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="btn btn-ghost btn-sm">← Workspaces</Link>
        <Link href={`/workspaces/${workspaceId}`} className="btn btn-ghost btn-sm">← {workspaceId}</Link>
        <h1 className="text-lg font-bold font-mono truncate">{peerId}</h1>
      </div>
      <PeerDetail
        peer={peer}
        representation={representation}
        context={context}
        sessions={sessions}
        workspaceId={workspaceId}
        conclusions={conclusions}
        peerId={peerId}
      />
    </div>
  );
}
