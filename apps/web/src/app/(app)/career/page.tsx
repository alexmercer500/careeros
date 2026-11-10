import { loadProfile, profileCompleteness } from "@careeros/core";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ProfileForm, type ProfileFormValues } from "@/features/career/profile-form";

export const metadata = {
  title: "My Career",
};

function text(value: string | null): string {
  return value ?? "";
}

function numberText(value: number | null): string {
  return value === null ? "" : String(value);
}

export default async function CareerPage() {
  const supabase = await createClient();
  const { profile } = await loadProfile(supabase);
  const completeness = profileCompleteness(profile);

  const initial: ProfileFormValues = {
    fullName: text(profile.full_name),
    headline: text(profile.headline),
    summary: text(profile.summary),
    phone: text(profile.phone),
    city: text(profile.city),
    country: text(profile.country),
    currentDesignation: text(profile.current_designation),
    currentCompany: text(profile.current_company),
    totalExperienceMonths: numberText(profile.total_experience_months),
    noticePeriodDays: numberText(profile.notice_period_days),
    linkedinUrl: text(profile.linkedin_url),
    githubUrl: text(profile.github_url),
    portfolioUrl: text(profile.portfolio_url),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Career</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The single source of truth for every document CareerOS generates later.
          </p>
        </div>
        <Badge variant={completeness.missing.length === 0 ? "success" : "muted"}>
          {completeness.percent}% complete
        </Badge>
      </div>

      <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Employment history is not editable yet</p>
        <p className="mt-1 text-amber-800">
          Employers, dates, projects and achievements are added in Phase 2 with a verification
          workflow. CareerOS never invents or pre-fills professional facts.
        </p>
      </div>

      <ProfileForm initial={initial} />
    </div>
  );
}
