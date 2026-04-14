"use client";

import { Bell, Search, Globe, User, ChevronDown, Menu } from "lucide-react";
import { useAlerts, useTreatments } from "@/hooks/useData";
import type { Alert, Treatment } from "@/lib/mock-data";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: alertsRaw } = useAlerts();
  const { data: treatmentsRaw } = useTreatments();
  const alerts = (alertsRaw || []) as Alert[];
  const treatments = (treatmentsRaw || []) as Treatment[];
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;
  const activeTreatments = treatments.filter((t) => t.status === "in_progress").length;

  return (
    <header className="glass-header sticky top-0 z-30 h-[73px] flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/50 hover:text-white/80"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher produits, parcelles, opérateurs..."
            className="glass-input w-full pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder-white/30"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="status-dot status-active" />
          <span className="text-xs font-medium text-amber-300">
            {activeTreatments} traitement{activeTreatments > 1 ? "s" : ""} actif{activeTreatments > 1 ? "s" : ""}
          </span>
        </div>

        {/* Language */}
        <button className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/40 hover:text-white/70">
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium">FR</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/40 hover:text-white/70">
          <Bell className="w-[18px] h-[18px]" />
          {unacknowledgedAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[rgba(26,46,26,0.5)]">
              {unacknowledgedAlerts}
            </span>
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-white/[0.08] hidden sm:block" />

        {/* User */}
        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-green-600/20 border border-amber-500/25 flex items-center justify-center">
            <User className="w-4 h-4 text-amber-300" />
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-white/80">Akram K.</span>
            <span className="text-[10px] text-white/40">Agronomiste</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/30 ml-1 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
