import { listMemberships, type ServerSupabaseClient, type WorkspaceRole } from "@careeros/database";
import { UnauthorizedError, WorkspaceNotProvisionedError } from "../errors";

export interface WorkspaceContext {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
}

/**
 * Resolves the caller's identity and active workspace on the server.
 *
 * Identity comes from the verified session; the workspace comes from the user's
 * own membership rows. A workspace id supplied by the client is never trusted.
 */
export async function resolveWorkspaceContext(
  client: ServerSupabaseClient,
): Promise<WorkspaceContext> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new UnauthorizedError();
  }

  const memberships = await listMemberships(client);
  const membership = memberships[0];
  if (!membership) {
    throw new WorkspaceNotProvisionedError();
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspaceName,
    role: membership.role,
  };
}
