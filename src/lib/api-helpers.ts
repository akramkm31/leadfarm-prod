/**
 * Shared API route helpers — auth verification + Zod validation + error formatting.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ZodSchema, ZodError } from "zod";

/**
 * Verify the user is authenticated via Supabase session cookie.
 * Returns the user object or a 401 NextResponse.
 */
export async function requireAuth(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // API routes don't need to set cookies
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: json({ error: "Non autorisé" }, 401) };
  }

  return { user, error: null };
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
