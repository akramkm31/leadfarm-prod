"use client";

import AppLayout from "@/components/layout/AppLayout";
import { useAccessContext } from "@/components/auth/AccessProvider";
import type { ComponentType, ReactNode } from "react";

export function MagasinierBranch({
  mag: Mag,
  children,
}: {
  mag: ComponentType;
  children: ReactNode;
}) {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <Mag />;
  }
  return <>{children}</>;
}

export function MagasinierPage({ mag: Mag }: { mag: ComponentType }) {
  return (
    <AppLayout>
      <Mag />
    </AppLayout>
  );
}
