import Link from "next/link";
import { loadProfile, profileCompleteness } from "@careeros/core";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MODULES = [
  { name: "Career profile", phase: "Phase 1", status: "available" },
  { name: "Employment, projects and achievements", phase: "Phase 2", status: "planned" },
  { name: "Job import and matching", phase: "Phase 3", status: "planned" },
  { name: "Resume generation and tracker", phase: "Phase 4", status: "planned" },
  { name: "Gmail and automation", phase: "Phase 5", status: "planned" },
  { name: "Analytics", phase: "Phase 6", status: "planned" },
] as const;

export const metadata = {
  title: "Overview",
};

export default async function OverviewPage() {
  const supabase = await createClient();
  const { profile, context } = await loadProfile(supabase);
  const completeness = profileCompleteness(profile);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.workspaceName} · signed in as {context.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Profile completeness" value={`${completeness.percent}%`} hint={`${completeness.completed} of ${completeness.total} tracked fields`} />
        <Stat label="Workspace role" value={context.role} hint="Personal workspace, single member" />
        <Stat label="Application records" value="0" hint="Applications arrive in Phase 4" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile readiness</CardTitle>
          <CardDescription>
            Completeness reflects filled fields only. Verification of facts happens in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completeness.percent}%` }}
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completeness"
            />
          </div>

          {completeness.missing.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">Still missing:</p>
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {completeness.missing.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-muted-foreground">
                    <span aria-hidden="true">•</span>
                    {field}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Every tracked field is filled in.</p>
          )}

          <Link
            href="/career"
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
          >
            {completeness.missing.length > 0 ? "Complete your profile" : "Review your profile"}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module status</CardTitle>
          <CardDescription>
            Only the career profile is functional today. Everything else is a marked placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {MODULES.map((module) => (
              <li key={module.name} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm">{module.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{module.phase}</span>
                  {module.status === "available" ? (
                    <Badge variant="success">Available</Badge>
                  ) : (
                    <Badge variant="muted">Planned</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
