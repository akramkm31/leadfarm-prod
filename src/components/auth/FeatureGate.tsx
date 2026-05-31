"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/hooks/useAccess";
import type { Feature } from "@/lib/rbac/types";

type Props = {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
};

/** Masque une action UI si le profil n'a pas la capacité. */
export default function FeatureGate({ feature, children, fallback = null }: Props) {
  const { can, loading } = useAccess();
  if (loading) return null;
  if (!can(feature)) return <>{fallback}</>;
  return <>{children}</>;
}
