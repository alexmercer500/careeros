import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "recovery",
  "invite",
  "email_change",
];

function loginError(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function safeDestination(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/overview";
}

/**
 * Completes an emailed sign-in server-side.
 *
 * Two shapes are accepted:
 *  - `token_hash` + `type`: the custom magic-link template. Works even when the
 *    link is opened on a different device from the one that requested it.
 *  - `code`: Supabase's default redirect, exchanged for a session using the
 *    PKCE verifier cookie stored by the browser that initiated the request.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const next = safeDestination(searchParams.get("next") ?? "/overview");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginError(origin, error.message);
    return NextResponse.redirect(new URL(next, origin));
  }

  if (!tokenHash) {
    return loginError(origin, "This sign-in link is invalid or incomplete.");
  }

  const requestedType = searchParams.get("type") ?? "email";
  const type = ALLOWED_TYPES.find((allowed) => allowed === requestedType);
  if (!type) {
    return loginError(origin, "This sign-in link is invalid or incomplete.");
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return loginError(origin, error.message);

  return NextResponse.redirect(new URL(next, origin));
}
