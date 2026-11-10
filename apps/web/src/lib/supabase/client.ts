import { createBrowserSupabaseClient } from "@careeros/database";

let cached: ReturnType<typeof createBrowserSupabaseClient> | null = null;

/**
 * Browser client. The anon key is public by design — RLS is the boundary.
 * Values must be referenced literally so Next can inline them at build time.
 */
export function createClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase browser environment is not configured.");
  }

  cached = createBrowserSupabaseClient({ url, anonKey });
  return cached;
}
