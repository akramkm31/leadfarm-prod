"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAlerts, useStockLevels, SUPABASE_CONFIGURED } from "@/hooks/useData";
import type { Alert, StockLevel } from "@/lib/mock-data";
import {
  LayoutDashboard,
  Package,
  Layers,
  Droplets,
  Map,
  Users,
  FileText,
  Leaf,
  FlaskConical,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tractor,
  TrendingDown,
  Truck,
  Zap,
} from "lucide-react";

function useNavGroups() {
  const { data: stockLevelsRaw } = useStockLevels();
  const { data: alertsRaw } = useAlerts();
  const stockLevels = (stockLevelsRaw || []) as StockLevel[];
  const alerts = (alertsRaw || []) as Alert[];
  const lowStockCount = stockLevels.filter((s) => s.status === "low" || s.status === "critical").length;
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  return [
    {
      label: "Principal",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      ],
    },
    {
      label: "Stock",
      items: [
        { href: "/stock", label: "Gestion de Stock", icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
        { href: "/products", label: "Produits Phyto", icon: FlaskConical },
        { href: "/suppliers", label: "Fournisseurs", icon: Truck },
      ],
    },
    {
      label: "Terrain",
      items: [
        { href: "/parcelles", label: "Parcelles", icon: Map },
        { href: "/treatments", label: "Traitements", icon: Droplets },
      ],
    },
    {
      label: "Gestion",
      items: [
        { href: "/live", label: "IoT Live", icon: Zap },
        { href: "/operators", label: "Opérateurs", icon: Users },
        { href: "/reports", label: "Rapports", icon: FileText },
        { href: "/alerts", label: "Alertes", icon: Bell, badge: unacknowledgedAlerts > 0 ? unacknowledgedAlerts : undefined },
      ],
    },
  ];
}

const bottomItems = [
  { href: "/settings", label: "Paramètres", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed = false, onCollapsedChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const isSupabase = SUPABASE_CONFIGURED;
  const navGroups = useNavGroups();
  const { data: stockLevelsRaw } = useStockLevels();
  const stockLevels = (stockLevelsRaw || []) as StockLevel[];
  const lowStockCount = stockLevels.filter((s) => s.status === "low" || s.status === "critical").length;

  return (
    <aside
      className={cn(
        "glass-sidebar fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-[280px]",
        // Mobile: hidden by default, slide in when open
        "max-lg:-translate-x-full max-lg:w-[280px]",
        mobileOpen && "max-lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[73px] border-b border-white/[0.08]">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-green-600/20 border border-amber-500/30 shrink-0">
          <Leaf className="w-5 h-5 text-amber-400" />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#14231280]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-white/90">
              LeadFarm
            </span>
            <span className="text-[11px] text-white/55 font-mono">
              Precision Agriculture
            </span>
          </div>
        )}
      </div>

      {/* Exploitation indicator + DB Status */}
      {!collapsed && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-br from-amber-500/[0.08] to-green-600/[0.05] border border-amber-500/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Tractor className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white/80 block leading-tight">Domaine Khelifa</span>
                <span className="text-[10px] text-white/50">Tlemcen, SBA</span>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono",
              isSupabase
                ? "bg-green-400/10 text-green-400"
                : "bg-white/5 text-white/45"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isSupabase ? "bg-green-400" : "bg-white/20")} />
              {isSupabase ? "Live" : "Local"}
            </div>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.06]">
              <TrendingDown className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400/70 font-mono">{lowStockCount} produit{lowStockCount > 1 ? "s" : ""} stock bas</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <span className="px-3 text-[10px] font-semibold text-white/45 uppercase tracking-wider">
                {group.label}
              </span>
            )}
            <div className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-amber-400 shadow-[0_0_8px_rgba(232,168,56,0.4)]" />
                    )}
                    <item.icon
                      className={cn(
                        "w-[18px] h-[18px] shrink-0 transition-colors",
                        isActive ? "text-amber-400" : "text-white/45 group-hover:text-white/70"
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-black/80 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-2 space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-white/[0.06] text-white/80"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-black/80 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onCollapsedChange?.(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
