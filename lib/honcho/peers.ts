import { honchoGet, honchoPost, honchoPostStream, honchoDelete } from "./client";
import type { Page, Peer, PeerContext, RepresentationResponse, Session, Message } from "./types";

export const createPeer = (workspaceId: string, peerId: string): Promise<Peer> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers`, { id: peerId, metadata: {} });

type ListParams = {
  readonly page?: number
  readonly size?: number
}

export const listPeers = (workspaceId: string, params: ListParams = {}): Promise<Page<Peer>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  });

export const getPeer = (workspaceId: string, peerId: string): Promise<Peer> =>
  honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}`);

export const getPeerRepresentation = (workspaceId: string, peerId: string): Promise<RepresentationResponse> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/${peerId}/representation`, {});

export const getPeerContext = (workspaceId: string, peerId: string): Promise<PeerContext> =>
  honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}/context`);

// Standalone Peer Card endpoint (`GET /v3/workspaces/{id}/peers/{peerId}/card`).
// `target` lets the observer ask for the card that the observer has built
// *about* some other peer; without it, returns the observer's own card.
export type PeerCard = {
  readonly peer_card: readonly string[] | null
}

export const getPeerCard = (
  workspaceId: string,
  peerId: string,
  target?: string,
): Promise<PeerCard> => {
  const qs = target ? `?target=${encodeURIComponent(target)}` : "";
  return honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}/card${qs}`);
};

// Dialectic (a.k.a. peer chat) — accepts the full DialecticOptions shape
// exposed by the OpenAPI spec. The Ask tab uses `chatPeer` (streaming),
// which is the right call for chat UX. The diagnose tool uses `askPeer`
// (non-streaming, returns parsed JSON) so it can render the answer
// alongside the retrieved context.
export type ReasoningLevel = "minimal" | "low" | "medium" | "high" | "max"

export type AskOptions = {
  readonly query: string
  readonly target?: string | null
  readonly session_id?: string | null
  readonly reasoning_level?: ReasoningLevel
  readonly stream?: boolean
}

export type ChatResponse = {
  readonly content: string | null
}

export const askPeer = (
  workspaceId: string,
  peerId: string,
  options: AskOptions,
): Promise<ChatResponse> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/${peerId}/chat`, {
    query: options.query,
    target: options.target ?? null,
    session_id: options.session_id ?? null,
    reasoning_level: options.reasoning_level ?? "low",
    stream: options.stream ?? false,
  });

export const chatPeer = (workspaceId: string, peerId: string, query: string): Promise<Response> =>
  honchoPostStream(`/v3/workspaces/${workspaceId}/peers/${peerId}/chat`, { query });

export const listPeerSessions = (workspaceId: string, peerId: string, params: ListParams = {}): Promise<Page<Session>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/${peerId}/sessions/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  });

// Peer-scoped message search (`POST /v3/workspaces/{id}/peers/{peerId}/search`).
// Distinct from the workspace-level `searchWorkspace` in `search.ts` —
// this one searches only messages authored by the given peer.
export type PeerMessageSearchOptions = {
  readonly query: string
  readonly limit?: number
  readonly filters?: Readonly<Record<string, unknown>> | null
}

export const searchPeerMessages = (
  workspaceId: string,
  peerId: string,
  options: PeerMessageSearchOptions,
): Promise<readonly Message[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/${peerId}/search`, {
    query: options.query,
    limit: options.limit ?? 10,
    filters: options.filters ?? null,
  });

export const deletePeer = (workspaceId: string, peerId: string): Promise<void> =>
  honchoDelete(`/v3/workspaces/${workspaceId}/peers/${peerId}`);
