"use client";

import { Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import DashboardView from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  return (
    <Suspense>
      <AppLayout>
        <DashboardView />
      </AppLayout>
    </Suspense>
  );
}
