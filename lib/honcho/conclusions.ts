import { honchoPost, honchoDelete } from "./client";
import type { Conclusion, Page } from "./types";

type ListParams = {
  readonly page?: number
  readonly size?: number
}

export const listConclusions = (workspaceId: string, params: ListParams = {}): Promise<Page<Conclusion>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  });

// Semantic-search request body.
//
// Honcho's /v3/workspaces/{id}/conclusions/query endpoint requires
// observer_id and observed_id to be passed inside the `filters` object.
// The OpenAPI spec's ConclusionQuery schema omits these fields, but the
// server enforces them at the application layer (not via Pydantic validation).
export type ConclusionQueryParams = {
  readonly query: string
  readonly observer_id: string
  readonly observed_id: string
  readonly top_k?: number
  readonly distance?: number | null
  readonly filters?: Readonly<Record<string, unknown>> | null
}

export const queryConclusions = (
  workspaceId: string,
  params: ConclusionQueryParams,
): Promise<readonly Conclusion[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions/query`, {
    query: params.query,
    top_k: params.top_k ?? 10,
    distance: params.distance ?? null,
    filters: {
      ...params.filters,
      observer_id: params.observer_id,
      observed_id: params.observed_id,
    },
  });

type ConclusionCreateItem = {
  readonly content: string
  readonly observer_id: string
  readonly observed_id: string
  readonly session_id?: string | null
}

export const createConclusions = (
  workspaceId: string,
  conclusions: readonly ConclusionCreateItem[],
): Promise<readonly Conclusion[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/conclusions`, { conclusions });

export const deleteConclusion = (workspaceId: string, conclusionId: string): Promise<void> =>
  honchoDelete(`/v3/workspaces/${workspaceId}/conclusions/${conclusionId}`);
