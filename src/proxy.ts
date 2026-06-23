import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canPath, defaultLandingPath } from "@/lib/rbac/policy";
import { loadUserAccessProfile } from "@/lib/rbac/server";
import { MOCK_PARCELLES } from "@/lib/data-provider-config";

const PUBLIC_ROUTES = [
  "/login",
  "/auth/callback",
  "/api/auth/login",
  "/api/readings",
  "/verify",
  "/api/v1/verify",
  "/lot/",
  "/api/v1/public/",
];

/** Marketing home + static media must stay reachable without a session. */
function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/media/")) return true;
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

function isLocalMockDev(): boolean {
  return process.env.NODE_ENV === "development" && MOCK_PARCELLES;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.APP_SITE === "app" && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute(pathname) || isLocalMockDev()) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth when Supabase is not configured (local/mock mode)
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: Record<string, unknown> }) =>
          supabaseResponse.cookies.set(name, value, options as any)
        );
      },
    },
  });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/api/")) {
      return supabaseResponse;
    }

    const access = await loadUserAccessProfile(supabase, user);
    if (!canPath(access, pathname)) {
      const dest = new URL(defaultLandingPath(access), request.url);
      dest.searchParams.set("access", "denied");
      return NextResponse.redirect(dest);
    }
  } catch {
    return NextResponse.next();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|farm-bg.webp|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
