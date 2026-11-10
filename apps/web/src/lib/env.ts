/**
 * Server-side environment access. Fails fast and loudly instead of silently
 * degrading into an app that cannot talk to its database.
 */
export interface ServerEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and run \`supabase status\` for the values.`,
    );
  }
  return value;
}

export function getServerEnv(): ServerEnv {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  };
}
