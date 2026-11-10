import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export interface BrowserSupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Browser-side client. Uses the public anon key only — Row Level Security is the
 * access control boundary, never key secrecy.
 */
export function createBrowserSupabaseClient(config: BrowserSupabaseConfig) {
  return createBrowserClient<Database>(config.url, config.anonKey);
}
