import { honchoGet, honchoPost } from './client'
import type { Page, Workspace } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listWorkspaces = (params: ListParams = {}): Promise<Page<Workspace>> =>
  honchoPost('/v3/workspaces/list', { page: params.page ?? 1, size: params.size ?? 50, reverse: false })

export const getWorkspace = (workspaceId: string): Promise<Workspace> =>
  honchoGet(`/v3/workspaces/${workspaceId}`)
