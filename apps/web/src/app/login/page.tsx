import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/overview");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            C
          </div>
          <div>
            <p className="text-sm font-semibold">CareerOS</p>
            <p className="text-xs text-muted-foreground">Career management platform</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Enter your email and we will send you a secure sign-in link.
          </p>
          <LoginForm initialError={params.error} next={params.next} />
        </div>

        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Local development: emails are captured by the local mail viewer at{" "}
            <a
              className="underline underline-offset-2"
              href="http://127.0.0.1:54324"
              target="_blank"
              rel="noreferrer"
            >
              127.0.0.1:54324
            </a>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
