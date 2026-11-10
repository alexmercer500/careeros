"use client";

import { useState, type FormEvent } from "react";
import { emailSchema } from "@careeros/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

interface LoginFormProps {
  initialError?: string;
  next?: string;
}

export function LoginForm({ initialError, next }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", message: initialError } : { kind: "idle" },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid email" });
      return;
    }

    setStatus({ kind: "sending" });

    const supabase = createClient();
    const callbackUrl = new URL("/auth/confirm", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: callbackUrl.toString() },
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }

    setStatus({ kind: "sent", email: parsed.data });
  }

  if (status.kind === "sent") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Check your inbox</p>
          <p className="mt-1 text-emerald-800">
            A sign-in link was sent to <span className="font-medium">{status.email}</span>. Open it in
            this browser to continue.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          The link can only be used once. If it expired, request a new one.
        </p>

        <Button variant="outline" className="w-full" onClick={() => setStatus({ kind: "idle" })}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status.kind === "sending"}
          required
        />
      </div>

      {status.kind === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {status.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Sending link…" : "Email me a sign-in link"}
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        CareerOS uses passwordless sign-in. Access is granted only after clicking the link sent to
        your email.
      </p>
    </form>
  );
}
