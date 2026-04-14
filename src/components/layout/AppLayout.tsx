"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { cn } from "@/lib/utils";

export default function AppLayout({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(fullWidth);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile sidebar on route change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1a2e1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-green-600/20 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <span className="text-sm text-white/40 font-mono">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Vivant animated background */}
      <div className="farm-backdrop" />
      <div className="farm-grid" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* App shell */}
      <div className="relative z-10 flex">
        {/* Sidebar — single instance, responsive behavior */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className={cn(
          "flex-1 transition-all duration-300 w-full",
          // Desktop margin
          "lg:ml-[280px]",
          sidebarCollapsed && "lg:ml-[72px]"
        )}>
          <Header onMenuClick={() => setMobileOpen(true)} />
          <div className="content-scroll p-4 sm:p-6 lg:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
