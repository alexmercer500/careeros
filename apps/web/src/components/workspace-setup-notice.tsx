import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown when an authenticated user has no workspace membership. In normal
 * operation the signup trigger provisions one, so this indicates a real problem
 * rather than a state the user can fix in the UI.
 */
export function WorkspaceSetupNotice({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Workspace not provisioned</CardTitle>
          <CardDescription>
            Signed in as {email}, but no workspace is attached to this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The signup trigger normally creates a personal workspace automatically. If this message
            persists, the database trigger may not have been applied — check the Phase 1 migration.
          </p>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
