import {
  getProfileByWorkspace,
  updateProfileByWorkspace,
  type ProfileRow,
  type ProfileUpdate,
  type ServerSupabaseClient,
} from "@careeros/database";
import { toFieldIssues, updateProfileSchema } from "@careeros/validation";
import { resolveWorkspaceContext, type WorkspaceContext } from "../auth/context";
import { NotFoundError, ValidationError } from "../errors";

/** API (camelCase) → column (snake_case) mapping for the profile update. */
const PROFILE_COLUMN_MAP = {
  fullName: "full_name",
  phone: "phone",
  city: "city",
  country: "country",
  headline: "headline",
  summary: "summary",
  currentDesignation: "current_designation",
  currentCompany: "current_company",
  totalExperienceMonths: "total_experience_months",
  noticePeriodDays: "notice_period_days",
  linkedinUrl: "linkedin_url",
  githubUrl: "github_url",
  portfolioUrl: "portfolio_url",
} as const satisfies Record<string, keyof ProfileUpdate>;

export interface ProfileView {
  profile: ProfileRow;
  context: WorkspaceContext;
}

export async function loadProfile(client: ServerSupabaseClient): Promise<ProfileView> {
  const context = await resolveWorkspaceContext(client);
  const profile = await getProfileByWorkspace(client, context.workspaceId);
  if (!profile) {
    throw new NotFoundError("Career profile not found");
  }
  return { profile, context };
}

export async function saveProfile(
  client: ServerSupabaseClient,
  input: unknown,
): Promise<ProfileRow> {
  const context = await resolveWorkspaceContext(client);

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(toFieldIssues(parsed.error));
  }

  const patch = toProfileUpdate(parsed.data);
  if (Object.keys(patch).length === 0) {
    throw new ValidationError([{ path: [], message: "No profile fields supplied" }]);
  }

  return updateProfileByWorkspace(client, context.workspaceId, patch);
}

function toProfileUpdate(input: Record<string, unknown>): ProfileUpdate {
  const patch: Record<string, unknown> = {};

  for (const [apiKey, column] of Object.entries(PROFILE_COLUMN_MAP)) {
    const value = input[apiKey];
    if (value === undefined) continue;
    patch[column] = value;
  }

  return patch as ProfileUpdate;
}
