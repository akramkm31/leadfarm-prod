"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAlertsPanel } from "./AlertsProvider";

function AlertsDeepLinkInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { openAlerts } = useAlertsPanel();

  useEffect(() => {
    if (searchParams.get("alerts") !== "1") return;
    openAlerts({ highlightId: searchParams.get("highlight") ?? undefined });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("alerts");
    next.delete("highlight");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, pathname, openAlerts, router]);

  return null;
}

export default function AlertsDeepLink() {
  return (
    <Suspense fallback={null}>
      <AlertsDeepLinkInner />
    </Suspense>
  );
}
