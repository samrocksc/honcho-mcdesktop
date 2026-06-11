import { honchoGet, honchoPost, honchoPostStream } from './client'
import type { Page, Peer, PeerContext, RepresentationResponse } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listPeers = (workspaceId: string, params: ListParams = {}): Promise<Page<Peer>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  })

export const getPeer = (workspaceId: string, peerId: string): Promise<Peer> =>
  honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}`)

export const getPeerRepresentation = (workspaceId: string, peerId: string): Promise<RepresentationResponse> =>
  honchoPost(`/v3/workspaces/${workspaceId}/peers/${peerId}/representation`, {})

export const getPeerContext = (workspaceId: string, peerId: string): Promise<PeerContext> =>
  honchoGet(`/v3/workspaces/${workspaceId}/peers/${peerId}/context`)

export const chatPeer = (workspaceId: string, peerId: string, query: string): Promise<Response> =>
  honchoPostStream(`/v3/workspaces/${workspaceId}/peers/${peerId}/chat`, { query })
