export const SUPABASE_CONFIGURED =
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;
