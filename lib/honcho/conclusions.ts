import { honchoPost } from './client'
import type { Conclusion, Page } from './types'

interface ListParams {
  readonly page?: number
  readonly size?: number
}

export const listConclusions = (workspaceId: string, params: ListParams = {}): Promise<Page<Conclusion>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  })

export const queryConclusions = (workspaceId: string, query: string): Promise<readonly Conclusion[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions/query`, { query })
