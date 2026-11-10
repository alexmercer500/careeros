import type { ServerSupabaseClient } from "../server";
import type { ProfileRow, ProfileUpdate } from "../types";

export async function getProfileByWorkspace(
  client: ServerSupabaseClient,
  workspaceId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("career_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfileByWorkspace(
  client: ServerSupabaseClient,
  workspaceId: string,
  patch: ProfileUpdate,
): Promise<ProfileRow> {
  const { data, error } = await client
    .from("career_profiles")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
