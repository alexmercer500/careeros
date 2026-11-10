import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and gates the app.
 * The workspace is resolved server-side later; nothing here trusts a client id.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment is not configured for middleware.");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (pathname !== "/") {
      redirectUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/overview";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
