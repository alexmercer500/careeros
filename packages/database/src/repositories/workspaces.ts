import type { ServerSupabaseClient } from "../server";
import type { WorkspaceRole } from "../types";

export interface MembershipSummary {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
}

/**
 * Lists the workspaces the current session belongs to. RLS already restricts this
 * to the caller's own memberships, so no additional filter is trusted from the client.
 */
export async function listMemberships(
  client: ServerSupabaseClient,
): Promise<MembershipSummary[]> {
  const { data: memberships, error } = await client
    .from("workspace_members")
    .select("workspace_id, role")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!memberships || memberships.length === 0) return [];

  const first = memberships[0];
  if (!first) return [];

  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .select("id, name")
    .eq("id", first.workspace_id)
    .single();

  if (workspaceError) throw workspaceError;

  return [
    {
      workspaceId: first.workspace_id,
      workspaceName: workspace.name,
      role: first.role,
    },
  ];
}
