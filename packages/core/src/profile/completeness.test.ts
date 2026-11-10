import { describe, expect, it } from "vitest";
import type { ProfileRow } from "@careeros/database";
import { profileCompleteness } from "./completeness";

function makeProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    workspace_id: "22222222-2222-2222-2222-222222222222",
    user_id: "33333333-3333-3333-3333-333333333333",
    full_name: "Test Person",
    phone: null,
    city: null,
    country: "India",
    headline: null,
    summary: null,
    current_designation: null,
    current_company: null,
    total_experience_months: null,
    notice_period_days: null,
    linkedin_url: null,
    github_url: null,
    portfolio_url: null,
    other_links: [],
    is_primary: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("profileCompleteness", () => {
  it("counts a single filled field out of ten", () => {
    const result = profileCompleteness(makeProfile());
    expect(result.total).toBe(10);
    expect(result.completed).toBe(1);
    expect(result.percent).toBe(10);
    expect(result.missing).toContain("Phone");
  });

  it("treats whitespace-only strings as missing", () => {
    const result = profileCompleteness(makeProfile({ full_name: "   " }));
    expect(result.completed).toBe(0);
    expect(result.missing).toContain("Full name");
  });

  it("counts zero as a present numeric value", () => {
    const result = profileCompleteness(makeProfile({ total_experience_months: 0 }));
    expect(result.missing).not.toContain("Total experience");
  });

  it("reports 100% when every field is present", () => {
    const result = profileCompleteness(
      makeProfile({
        phone: "+91 90000 00000",
        city: "Pune",
        headline: "Product-minded Full Stack Engineer",
        summary: "Builds things.",
        current_designation: "Engineer",
        current_company: "Acme",
        total_experience_months: 48,
        notice_period_days: 30,
        linkedin_url: "https://linkedin.com/in/example",
      }),
    );
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });
});
