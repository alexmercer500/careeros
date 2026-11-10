import { resolveWorkspaceContext } from "@careeros/core";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const context = await resolveWorkspaceContext(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only account facts for this phase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Identity is managed by Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border text-sm">
            <Row label="Email" value={context.email} />
            <Row label="Workspace" value={context.workspaceName} />
            <Row label="Role" value={context.role} />
            <Row label="Workspace ID" value={context.workspaceId} mono />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Workspace administration</CardTitle>
            <Badge variant="warning">Planned</Badge>
          </div>
          <CardDescription>
            Inviting members, changing roles, quotas, billing, and account deletion are Phase 7.
            The database is already multi-tenant, so nothing here needs to be retrofitted.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
