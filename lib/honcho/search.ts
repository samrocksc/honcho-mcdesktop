import { honchoPost } from "./client";
import type { Message } from "./types";

export const searchWorkspace = (workspaceId: string, query: string): Promise<readonly Message[]> =>
  honchoPost(`/v3/workspaces/${workspaceId}/search`, { query });
