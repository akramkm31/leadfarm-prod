"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Menu, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useAlerts } from "@/hooks/useData";
import type { Alert } from "@/lib/mock-data";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { crumbsFromPathname } from "@/lib/page-crumbs";
import { cn } from "@/lib/utils";
import { useAccess } from "@/hooks/useAccess";
import CommandPalette from "./CommandPalette";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const crumbs = crumbsFromPathname(pathname || "/dashboard");
  const { data: alertsRaw } = useAlerts();
  const alerts = (alertsRaw || []) as Alert[];
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;
  const { roleLabel, can } = useAccess();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setUserOpen(false);
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

  return (
    <>
      <header className="lf-topbar sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-[#f1f5e6]"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav className="lf-crumbs" aria-label="Fil d'Ariane">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-2 min-w-0">
                {i > 0 && <span aria-hidden>›</span>}
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="hover:text-[var(--color-valley-green)] truncate">
                    {c.label}
                  </Link>
                ) : (
                  <span className={cn(i === crumbs.length - 1 ? "now truncate" : "truncate")}>
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="lf-topbar-right">
          {roleLabel && (
            <span
              className="hidden md:inline-flex mono text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-full border border-[var(--color-stone-moss)] text-[var(--color-valley-green)] bg-[#f5f8ec]"
              title="Profil applicatif"
            >
              {roleLabel}
            </span>
          )}
          <span className="lf-live-pill hidden sm:inline-flex" title="Données synchronisées en temps réel">
            <span className="lf-live-dot" />
            SYNC LIVE
          </span>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="lf-btn lf-btn-tertiary"
            aria-label={`Rechercher (${shortcutLabel})`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rechercher</span>
            <span className="mono text-[10px] opacity-60 hidden sm:inline">{shortcutLabel}</span>
          </button>
          {can("alerts") && (
            <Link href="/alerts" className="lf-btn lf-btn-tertiary relative">
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alertes</span>
              {unacknowledged > 0 && (
                <span className="ml-1 mono text-[9px] bg-[var(--color-amber-seed)] text-[var(--color-canvas-ice)] px-1.5 py-0.5 rounded-full">
                  {unacknowledged}
                </span>
              )}
            </Link>
          )}
          <div className="relative" ref={userRef}>
            <button
              ref={userTriggerRef}
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className="lf-sb-avatar"
              aria-label="Menu compte"
              aria-expanded={userOpen}
              aria-haspopup="menu"
            >
              AK
            </button>
            {userOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 card-soft py-2 z-50 shadow-lg"
                role="menu"
              >
                {can("settings") && (
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#f1f5e6]"
                    onClick={() => setUserOpen(false)}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Paramètres
                  </Link>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[#f1f5e6] text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
