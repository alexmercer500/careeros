import type { ProfileRow } from "@careeros/database";

interface CompletenessField {
  column: keyof ProfileRow;
  label: string;
}

const COMPLETENESS_FIELDS: CompletenessField[] = [
  { column: "full_name", label: "Full name" },
  { column: "headline", label: "Professional headline" },
  { column: "summary", label: "Professional summary" },
  { column: "phone", label: "Phone" },
  { column: "city", label: "City" },
  { column: "current_designation", label: "Current designation" },
  { column: "current_company", label: "Current company" },
  { column: "total_experience_months", label: "Total experience" },
  { column: "notice_period_days", label: "Notice period" },
  { column: "linkedin_url", label: "LinkedIn profile" },
];

export interface ProfileCompleteness {
  completed: number;
  total: number;
  percent: number;
  missing: string[];
}

/**
 * Measures how much of the profile has been filled in. This is a completeness
 * signal only — it says nothing about whether the facts are verified.
 */
export function profileCompleteness(profile: ProfileRow): ProfileCompleteness {
  const missing: string[] = [];

  for (const field of COMPLETENESS_FIELDS) {
    const value = profile[field.column];
    const present =
      typeof value === "string"
        ? value.trim().length > 0
        : value !== null && value !== undefined;

    if (!present) {
      missing.push(field.label);
    }
  }

  const total = COMPLETENESS_FIELDS.length;
  const completed = total - missing.length;

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    missing,
  };
}
