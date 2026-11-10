import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { WorkspaceNotProvisionedError, resolveWorkspaceContext } from "@careeros/core";
import { AppShell } from "@/components/app-shell";
import { WorkspaceSetupNotice } from "@/components/workspace-setup-notice";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const context = await resolveWorkspaceContext(supabase);
    return (
      <AppShell
        userEmail={context.email || (user.email ?? "")}
        workspaceName={context.workspaceName}
        role={context.role}
      >
        {children}
      </AppShell>
    );
  } catch (error) {
    if (error instanceof WorkspaceNotProvisionedError) {
      return <WorkspaceSetupNotice email={user.email ?? ""} />;
    }
    throw error;
  }
}
