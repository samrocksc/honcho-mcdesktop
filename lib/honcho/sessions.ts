import { honchoGet, honchoPost, honchoDelete } from "./client";
import type { Page, Session, Message } from "./types";

type ListParams = {
  readonly page?: number
  readonly size?: number
}

export const listSessions = (workspaceId: string, params: ListParams = {}): Promise<Page<Session>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/sessions/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  });

export const getSession = (workspaceId: string, sessionId: string): Promise<Session> =>
  honchoGet(`/v3/workspaces/${workspaceId}/sessions/${sessionId}`);

export const listMessages = (workspaceId: string, sessionId: string, params: ListParams = {}): Promise<Page<Message>> =>
  honchoPost(`/v3/workspaces/${workspaceId}/sessions/${sessionId}/messages/list`, {
    page: params.page ?? 1,
    size: params.size ?? 50,
    reverse: false,
  });

export const createSession = (workspaceId: string, sessionId: string): Promise<Session> =>
  honchoPost(`/v3/workspaces/${workspaceId}/sessions`, { id: sessionId });

// Returns 202 Accepted; deletion is async.
export const deleteSession = (workspaceId: string, sessionId: string): Promise<void> =>
  honchoDelete(`/v3/workspaces/${workspaceId}/sessions/${sessionId}`);
