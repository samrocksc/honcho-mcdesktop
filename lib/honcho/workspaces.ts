import { honchoGet, honchoPost, honchoDelete } from "./client";
import type { Page, Workspace } from "./types";

type ListParams = {
  readonly page?: number
  readonly size?: number
}

export const listWorkspaces = (params: ListParams = {}): Promise<Page<Workspace>> =>
  honchoPost("/v3/workspaces/list", { page: params.page ?? 1, size: params.size ?? 50, reverse: false });

export const getWorkspace = (workspaceId: string): Promise<Workspace> =>
  honchoGet(`/v3/workspaces/${workspaceId}`);

// Honcho uses "get or create" semantics — safe to call if workspace already exists.
export const createWorkspace = (id: string): Promise<Workspace> =>
  honchoPost("/v3/workspaces", { id, metadata: {} });

// Returns 202 Accepted; deletion is async. Returns 409 if active sessions exist.
export const deleteWorkspace = (workspaceId: string): Promise<void> =>
  honchoDelete(`/v3/workspaces/${workspaceId}`);
