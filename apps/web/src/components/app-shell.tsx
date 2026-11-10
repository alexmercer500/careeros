import type { ReactNode } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  workspaceName: string;
  role: string;
}

export function AppShell({ children, userEmail, workspaceName, role }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            C
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">CareerOS</p>
            <p className="truncate text-[11px] text-muted-foreground">Career management</p>
          </div>
        </div>

        <SidebarNav />

        <div className="mt-auto space-y-2 border-t border-border p-4">
          <p className="truncate text-xs text-muted-foreground" title={userEmail}>
            {userEmail}
          </p>
          <form action="/auth/signout" method="post">
            <Button variant="outline" size="sm" type="submit" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-5 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspaceName}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{role}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:inline">
              {userEmail}
            </span>
            <form action="/auth/signout" method="post" className="lg:hidden">
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <div className="border-b border-border bg-card lg:hidden">
          <SidebarNav layout="horizontal" />
        </div>

        <main className="flex-1 px-5 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
