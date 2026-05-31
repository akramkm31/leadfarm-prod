"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "./ThemeProvider";
import { AccessProvider } from "@/components/auth/AccessProvider";
import RouteAccessGuard from "@/components/auth/RouteAccessGuard";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <ThemeProvider>
      <AccessProvider>
        <div className="min-h-screen flex" style={{ background: "var(--color-canvas-ice)" }}>
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            onFlyoutOpenChange={setFlyoutOpen}
          />

          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 lf-app-main transition-[margin] duration-200 ease-out",
              "lg:ml-[72px]",
              flyoutOpen && "lg:ml-[332px]"
            )}
          >
            <Header onMenuClick={() => setMobileOpen(true)} />
            <div className={cn("lf-content", isDashboard && "lf-content--page-scroll")}>
              <ErrorBoundary>
                <RouteAccessGuard>{children}</RouteAccessGuard>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </AccessProvider>
    </ThemeProvider>
  );
}
