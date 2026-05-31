"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccess } from "@/hooks/useAccess";
import { defaultLandingPath } from "@/lib/rbac/policy";
import { PageSkeleton } from "@/components/ui/Skeleton";

/**
 * Redirige vers une page autorisée si le profil n'a pas accès à la route courante.
 */
export default function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, profile, canPath } = useAccess();

  useEffect(() => {
    if (loading || !profile || !pathname) return;
    if (canPath(pathname)) return;

    const fallback = defaultLandingPath(profile);
    const target =
      fallback === pathname ? "/dashboard" : `${fallback}?access=denied`;
    router.replace(target);
  }, [loading, profile, pathname, canPath, router]);

  if (loading) {
    return (
      <div className="p-6">
        <PageSkeleton />
      </div>
    );
  }

  if (profile && pathname && !canPath(pathname)) {
    return (
      <div className="p-6">
        <PageSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}
