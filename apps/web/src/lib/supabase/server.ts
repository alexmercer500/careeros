import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@careeros/database";
import { getServerEnv } from "@/lib/env";

/**
 * Request-scoped Supabase client for Server Components and Route Handlers.
 * Every query runs under the caller's session, so Postgres RLS applies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerSupabaseClient(
    { url: env.supabaseUrl, anonKey: env.supabaseAnonKey },
    {
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session, so this is expected and safe to ignore here.
        }
      },
    },
  );
}
