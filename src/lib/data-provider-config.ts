export const SUPABASE_CONFIGURED =
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Allow mock parcelle fallback when Supabase fetch fails in development */
export const MOCK_PARCELLES =
  process.env.NEXT_PUBLIC_MOCK_PARCELLES === "true" ||
  process.env.NEXT_PUBLIC_MOCK_PARCELLES === "1";
