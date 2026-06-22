"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "./ThemeProvider";
import { useAccessContext } from "@/components/auth/AccessProvider";
import RouteAccessGuard from "@/components/auth/RouteAccessGuard";
import { AlertsProvider } from "@/components/alerts/AlertsProvider";
import AlertsDeepLink from "@/components/alerts/AlertsDeepLink";
import { HeaderActionsProvider } from "@/components/layout/HeaderActions";
import { HeaderMetaProvider } from "@/components/layout/HeaderMeta";
import MagRouteMeta from "@/components/magasinier/MagRouteMeta";
import AgRouteMeta from "@/components/agronome/AgRouteMeta";
import { cn } from "@/lib/utils";

function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const { profile } = useAccessContext();
  const isMagasinier = profile?.role === "magasinier";
  const isAgronome = profile?.role === "agronome";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <MagRouteMeta />
      <AgRouteMeta />
      <AlertsDeepLink />
      <div
        className={cn("min-h-screen flex", isDashboard && "bg-canvas", isMagasinier && "mag-app", isAgronome && "agro-app")}
        style={isDashboard ? undefined : { background: "var(--color-canvas-ice)" }}
      >
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onFlyoutOpenChange={setFlyoutOpen}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 lf-app-main transition-[margin] duration-300 ease-out",
            !sidebarCollapsed && "md:ml-[72px]",
            !sidebarCollapsed && flyoutOpen && "md:ml-[332px]"
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
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AlertsProvider>
        <HeaderActionsProvider>
          <HeaderMetaProvider>
            <AppLayoutShell>{children}</AppLayoutShell>
          </HeaderMetaProvider>
        </HeaderActionsProvider>
      </AlertsProvider>
    </ThemeProvider>
  );
}
