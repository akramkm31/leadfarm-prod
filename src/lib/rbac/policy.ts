import { API_FEATURE_RULES, ROLE_FEATURES } from "./matrix";
import { normalizeRole } from "./roles";
import { featureForPath } from "./routes";
import type { Feature, UserAccessProfile, UserRole } from "./types";

export function featuresForRole(role: UserRole): Feature[] {
  return [...ROLE_FEATURES[role]];
}

export function buildAccessProfile(
  userId: string,
  rawRole: string | null | undefined,
  exploitationId: string | null
): UserAccessProfile {
  const role = normalizeRole(rawRole);
  return {
    userId,
    role,
    exploitationId,
    features: featuresForRole(role),
  };
}

export function can(profile: Pick<UserAccessProfile, "features">, feature: Feature): boolean {
  return profile.features.includes(feature);
}

export function canAny(profile: Pick<UserAccessProfile, "features">, features: Feature[]): boolean {
  return features.some((f) => can(profile, f));
}

/** Returns true only when the profile has ALL listed features. */
export function canAll(profile: Pick<UserAccessProfile, "features">, features: Feature[]): boolean {
  return features.every((f) => can(profile, f));
}

export function canPath(profile: Pick<UserAccessProfile, "features">, pathname: string): boolean {
  const required = featureForPath(pathname);
  if (!required) return true;
  return can(profile, required);
}

export function requiredFeatureForApi(method: string, pathname: string): Feature | null {
  const upper = method.toUpperCase();
  for (const rule of API_FEATURE_RULES) {
    if (rule.method === upper && pathname.startsWith(rule.pathPrefix)) {
      return rule.feature;
    }
  }
  return null;
}

export function canApi(
  profile: Pick<UserAccessProfile, "features">,
  method: string,
  pathname: string
): boolean {
  const required = requiredFeatureForApi(method, pathname);
  if (required) return can(profile, required);
  // No explicit rule: allow read-only methods, deny writes (fail-safe for unregistered routes)
  const upper = method.toUpperCase();
  return upper === "GET" || upper === "HEAD" || upper === "OPTIONS";
}

/** Première route autorisée (fallback après refus). */
export function defaultLandingPath(profile: Pick<UserAccessProfile, "features">): string {
  const order = [
    "/dashboard",
    "/stock",
    "/treatments",
    "/parcelles",
    "/registre",
    "/audit",
    "/settings",
  ] as const;
  for (const path of order) {
    const feat = featureForPath(path);
    if (feat && can(profile, feat)) return path;
  }
  return "/dashboard";
}
