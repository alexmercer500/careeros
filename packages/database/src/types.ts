import type { Database } from "./database.types";

export type { Database };

export type ProfileRow = Database["public"]["Tables"]["career_profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["career_profiles"]["Update"];
export type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
export type MembershipRow = Database["public"]["Tables"]["workspace_members"]["Row"];
export type AppUserRow = Database["public"]["Tables"]["users"]["Row"];
export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
