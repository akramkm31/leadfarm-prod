"use client";

import type { ReactNode } from "react";
import { AccessProvider } from "@/components/auth/AccessProvider";
import AssistantWidget from "@/components/assistant/AssistantWidget";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AccessProvider>
      {children}
      <AssistantWidget />
    </AccessProvider>
  );
}
