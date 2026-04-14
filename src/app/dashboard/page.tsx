"use client";

import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import TreatmentActivityChart from "@/components/dashboard/TreatmentActivityChart";
import ActiveTreatments from "@/components/dashboard/ActiveTreatments";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import StockOverview from "@/components/dashboard/StockOverview";
import RecentTreatments from "@/components/dashboard/RecentTreatments";
import { useDashboardStats } from "@/hooks/useData";
import type { DashboardStats } from "@/lib/mock-data";
import {
  Package,
  Droplets,
  Map,
  TrendingDown,
  AlertTriangle,
  LayoutDashboard,
  Leaf,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="glass-card h-[440px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-xs text-white/40">Chargement de la carte...</span>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  const { data: statsRaw, loading } = useDashboardStats();
  const dashboardStats = (statsRaw || { totalProducts: 0, treatmentsThisMonth: 0, treatmentsTrend: 0, totalAreaHectares: 0, totalParcelles: 0, lowStockCount: 0, alertsCount: 0 }) as DashboardStats;

  return (
    <AppLayout>
      {/* ── Hero Header ── */}
      <div className="glass-card p-5 mb-6 relative overflow-hidden">
        {/* Decorative background accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-amber-500/[0.05] blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4">
          {/* Left: Title block */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-green-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Leaf className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tableau de Bord</h1>
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-2">
                <LayoutDashboard className="w-3 h-3 text-white/40" />
                Domaine Khelifa, Tlemcen &mdash; {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="relative grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mt-5">
          {/* Produits */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white font-mono tabular-nums leading-none">{dashboardStats.totalProducts}</p>
              <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">Produits</p>
            </div>
          </div>

          {/* Traitements */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold text-white font-mono tabular-nums leading-none">{dashboardStats.treatmentsThisMonth}</p>
                {dashboardStats.treatmentsTrend !== 0 && (
                  <span className={cn("flex items-center text-[10px] font-mono font-bold", dashboardStats.treatmentsTrend > 0 ? "text-green-400" : "text-red-400")}>
                    {dashboardStats.treatmentsTrend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(dashboardStats.treatmentsTrend)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">Traitements</p>
            </div>
          </div>

          {/* Parcelles */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Map className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white font-mono tabular-nums leading-none">{dashboardStats.totalAreaHectares.toFixed(0)} <span className="text-xs font-normal text-white/40">ha</span></p>
              <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">{dashboardStats.totalParcelles} parcelles</p>
            </div>
          </div>

          {/* Stock Bas */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            dashboardStats.lowStockCount > 0
              ? "bg-amber-500/[0.06] border-amber-500/15 hover:bg-amber-500/[0.1]"
              : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              dashboardStats.lowStockCount > 0
                ? "bg-amber-500/15 border border-amber-500/20"
                : "bg-white/[0.06] border border-white/[0.08]"
            )}>
              <TrendingDown className={cn("w-4 h-4", dashboardStats.lowStockCount > 0 ? "text-amber-400" : "text-white/40")} />
            </div>
            <div>
              <p className={cn("text-lg font-bold font-mono tabular-nums leading-none", dashboardStats.lowStockCount > 0 ? "text-amber-400" : "text-white/40")}>{dashboardStats.lowStockCount}</p>
              <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">Stock bas</p>
            </div>
          </div>

          {/* Alertes */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            dashboardStats.alertsCount > 0
              ? "bg-red-500/[0.06] border-red-500/15 hover:bg-red-500/[0.1]"
              : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              dashboardStats.alertsCount > 0
                ? "bg-red-500/15 border border-red-500/20"
                : "bg-white/[0.06] border border-white/[0.08]"
            )}>
              <AlertTriangle className={cn("w-4 h-4", dashboardStats.alertsCount > 0 ? "text-red-400" : "text-white/40")} />
            </div>
            <div>
              <p className={cn("text-lg font-bold font-mono tabular-nums leading-none", dashboardStats.alertsCount > 0 ? "text-red-400" : "text-white/40")}>{dashboardStats.alertsCount}</p>
              <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">Alertes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">
          <DashboardMap />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <ActiveTreatments />
        </div>
        <div className="col-span-12 xl:col-span-8">
          <TreatmentActivityChart />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <AlertsFeed />
        </div>
        <div className="col-span-12">
          <RecentTreatments />
        </div>
        <div className="col-span-12">
          <StockOverview />
        </div>
      </div>

      <div className="h-8" />
    </AppLayout>
  );
}
