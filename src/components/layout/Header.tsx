"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Globe, User, ChevronDown, Menu, LogOut, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { useAlerts, useTreatments } from "@/hooks/useData";
import type { Alert, Treatment } from "@/lib/mock-data";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import CommandPalette from "./CommandPalette";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { data: alertsRaw } = useAlerts();
  const { data: treatmentsRaw } = useTreatments();
  const alerts = (alertsRaw || []) as Alert[];
  const treatments = (treatmentsRaw || []) as Treatment[];
  const unacknowledged = alerts.filter((a) => !a.acknowledged);
  const activeTreatments = treatments.filter((t) => t.status === "in_progress").length;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  // Cmd+K / Ctrl+K to open palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
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

  const recentAlerts = unacknowledged.slice(0, 5);
  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

  return (
    <>
      <header className="glass-header sticky top-0 z-30 h-[73px] flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/65 hover:text-white/90 relative"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
            {unacknowledged.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[rgba(26,46,26,0.5)]">
                {unacknowledged.length}
              </span>
            )}
          </button>

          {/* Command palette trigger (replaces decorative search) */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="relative flex-1 max-w-md hidden sm:flex items-center gap-2 glass-input pl-3 pr-2 py-2.5 text-left text-sm text-white/55 hover:text-white/80 transition-colors"
            aria-label={`Ouvrir la palette de recherche (${shortcutLabel})`}
          >
            <Search className="w-4 h-4 text-white/55" />
            <span className="flex-1 truncate">Rechercher pages, modules…</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-[10px] font-mono text-white/65">
              {shortcutLabel}
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="status-dot status-active" />
            <span className="text-xs font-medium text-amber-300">
              {activeTreatments} traitement{activeTreatments > 1 ? "s" : ""} actif{activeTreatments > 1 ? "s" : ""}
            </span>
          </div>

          <button
            className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/65 hover:text-white/90"
            aria-label="Langue"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">FR</span>
          </button>

          {/* Notifications popover */}
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => { setBellOpen((v) => !v); setUserOpen(false); }}
              className="relative p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/65 hover:text-white/90"
              aria-label={`Notifications (${unacknowledged.length})`}
              aria-expanded={bellOpen}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unacknowledged.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[rgba(26,46,26,0.5)]">
                  {unacknowledged.length}
                </span>
              )}
            </button>
            {bellOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 glass-card overflow-hidden animate-page-enter z-50"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/90">Alertes</span>
                  <span className="text-[10px] font-mono text-white/55">
                    {unacknowledged.length} non-lue{unacknowledged.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {recentAlerts.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="text-xs text-white/65">Aucune alerte active</div>
                      <div className="text-[11px] text-white/45 mt-1">Tous les seuils sont respectés</div>
                    </div>
                  ) : (
                    recentAlerts.map((a) => (
                      <Link
                        key={a.id}
                        href="/alerts"
                        onClick={() => setBellOpen(false)}
                        className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-b-0"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white/85 truncate">
                            {a.message || a.type}
                          </div>
                          {a.timestamp && (
                            <div className="text-[10px] text-white/55 mt-0.5 font-mono">
                              {new Date(a.timestamp).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/alerts"
                  onClick={() => setBellOpen(false)}
                  className="block px-4 py-2.5 text-center text-xs font-medium text-amber-300 hover:bg-amber-500/10 border-t border-white/[0.08] transition-colors"
                >
                  Voir toutes les alertes →
                </Link>
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-white/[0.08] hidden sm:block" />

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => { setUserOpen((v) => !v); setBellOpen(false); }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              aria-label="Menu utilisateur"
              aria-expanded={userOpen}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-green-600/20 border border-amber-500/25 flex items-center justify-center">
                <User className="w-4 h-4 text-amber-300" />
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-white/90">Akram K.</span>
                <span className="text-[10px] text-white/65">Agronomiste</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-white/55 ml-1 hidden sm:block transition-transform", userOpen && "rotate-180")} />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 glass-card overflow-hidden animate-page-enter z-50" role="menu">
                <div className="px-4 py-3 border-b border-white/[0.08]">
                  <div className="text-sm font-semibold text-white/90">Akram K.</div>
                  <div className="text-[11px] text-white/65 font-mono">akram@leadfarm.dz</div>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/85 hover:bg-white/[0.04] transition-colors"
                >
                  <SettingsIcon className="w-4 h-4 text-white/65" />
                  Paramètres
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/[0.08]"
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
