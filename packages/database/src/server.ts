import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";

export interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Cookie adapter supplied by the host framework. Keeping this out of the package
 * is what lets `packages/database` stay framework-agnostic (no `next/headers`).
 */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: CookieToSet[]): void;
}

export interface ServerSupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Server-side, request-scoped client. Carries the user's session cookie, so every
 * query is evaluated by Postgres under that user's RLS policies.
 */
export function createServerSupabaseClient(config: ServerSupabaseConfig, cookies: CookieAdapter) {
  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookies.setAll(
          cookiesToSet.map(({ name, value, options }) => ({ name, value, options })),
        );
      },
    },
  });
}

export type ServerSupabaseClient = ReturnType<typeof createServerSupabaseClient>;
