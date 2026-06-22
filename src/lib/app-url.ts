/** App origin for marketing → app links (NEXT_PUBLIC_APP_URL on marketing deploy). */
export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export function appPath(path: string): string {
  const origin = appOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${normalized}` : normalized;
}
