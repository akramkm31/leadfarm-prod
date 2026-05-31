/**
 * Shared API route helpers — auth verification + Zod validation + error formatting.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ZodSchema, ZodError } from "zod";
import { can, canApi } from "@/lib/rbac/policy";
import { loadUserAccessProfile } from "@/lib/rbac/server";
import type { Feature, UserAccessProfile } from "@/lib/rbac/types";

/** Session-aware Supabase client for Route Handlers (RLS applies). */
export function createRouteHandlerClient(req: NextRequest): SupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
}

export type AuthContext =
  | { user: User; supabase: SupabaseClient; access: UserAccessProfile; error: null }
  | { user: null; supabase: null; access: null; error: NextResponse };

/**
 * Auth + Supabase client in one call — use for all protected API routes (RLS).
 */
export async function withAuth(req: NextRequest): Promise<AuthContext> {
  const supabase = createRouteHandlerClient(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase: null, access: null, error: json({ error: "Non autorisé" }, 401) };
  }

  const access = await loadUserAccessProfile(supabase, user);
  return { user, supabase, access, error: null };
}

/** Vérifie une capacité métier — retourne 403 si refusé. */
export function requireFeature(
  auth: Extract<AuthContext, { error: null }>,
  feature: Feature
): NextResponse | null {
  if (!can(auth.access, feature)) {
    return json({ error: "Accès refusé pour ce profil", feature }, 403);
  }
  return null;
}

/** Applique les règles API déclarées dans rbac/matrix (méthode + chemin). */
export function requireApiAccess(
  auth: Extract<AuthContext, { error: null }>,
  req: NextRequest
): NextResponse | null {
  const pathname = req.nextUrl.pathname;
  if (!canApi(auth.access, req.method, pathname)) {
    return json(
      { error: "Accès refusé pour ce profil", path: pathname, method: req.method },
      403
    );
  }
  return null;
}

/**
 * Auth + contrôle RBAC API (à appeler en tête de chaque route protégée).
 */
export async function withAuthRbac(req: NextRequest): Promise<AuthContext> {
  const auth = await withAuth(req);
  if (auth.error) return auth;
  const denied = requireApiAccess(auth as Extract<AuthContext, { error: null }>, req);
  if (denied) {
    return { user: null, supabase: null, access: null, error: denied };
  }
  return auth;
}

/**
 * @deprecated Prefer `withAuth` when the route queries Supabase.
 */
export async function requireAuth(req: NextRequest) {
  const result = await withAuthRbac(req);
  if (result.error) return { user: null, access: null, error: result.error };
  return { user: result.user, access: result.access, error: null };
}

/**
 * Validate request body against a Zod schema.
 * Returns validated data or a 400 NextResponse with detailed errors.
 */
export function validateBody<T>(body: unknown, schema: ZodSchema<T>): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    const data = schema.parse(body);
    return { data, error: null };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return { data: null, error: json({ error: "Validation échouée", details: messages }, 400) };
    }
    return { data: null, error: json({ error: "Données invalides" }, 400) };
  }
}

/**
 * Shorthand for NextResponse.json with status.
 */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Clamp pagination params to safe ranges.
 */
export function parsePagination(params: URLSearchParams, maxLimit = 500) {
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "100", 10) || 100, 1), maxLimit);
  const offset = Math.max(parseInt(params.get("offset") || "0", 10) || 0, 0);
  return { limit, offset };
}
