"use client";

import { useState, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAlerts, useStockLevels, SUPABASE_CONFIGURED } from "@/hooks/useData";
import type { Alert, StockLevel } from "@/lib/mock-data";
import { FARM_DISPLAY_NAME } from "@/lib/ux-labels";
import { useAccess } from "@/hooks/useAccess";
import { filterNavGroups } from "@/lib/rbac/navigation";
import {
  LayoutDashboard,
  Map as MapIcon,
  Droplets,
  BookOpen,
  Package,
  FlaskConical,
  Truck,
  Zap,
  Satellite,
  ScanEye,
  ShieldCheck,
  History,
  GitBranch,
  CalendarDays,
  Bell,
  Users,
  FileText,
  Beaker,
  Settings,
  Leaf,
  Tractor,
  Wheat,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number };
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[]; badge?: number };

const GROUP_ICONS: Record<string, React.ElementType> = {
  pilotage: LayoutDashboard,
  operations: Package,
  audit: ShieldCheck,
};

const ITEM_ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/parcelles": MapIcon,
  "/treatments": Droplets,
  "/registre": BookOpen,
  "/trace": GitBranch,
  "/campagnes": CalendarDays,
  "/stock": Package,
  "/products": FlaskConical,
  "/suppliers": Truck,
  "/live": Zap,
  "/satellite": Satellite,
  "/vision": ScanEye,
  "/fertigation": Beaker,
  "/conformite": ShieldCheck,
  "/audit": History,
  "/alerts": Bell,
  "/operators": Users,
  "/reports": FileText,
  "/micro-zones": MapIcon,
  "/protocoles": BookOpen,
  "/maladies": ScanEye,
  "/meteo": Droplets,
  "/admin": Users,
};

function useNavGroups(lowStock: number, alerts: number): NavGroup[] {
  const { profile } = useAccess();
  if (!profile) return [];

  const filtered = filterNavGroups(profile);
  return filtered.map((group) => ({
    id: group.id,
    label: group.label,
    icon: GROUP_ICONS[group.id] ?? LayoutDashboard,
    badge:
      group.id === "operations" && lowStock > 0
        ? lowStock
        : group.id === "audit" && alerts > 0
          ? alerts
          : undefined,
    items: group.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: ITEM_ICONS[item.href] ?? LayoutDashboard,
      badge:
        item.href === "/stock" && lowStock > 0
          ? lowStock
          : item.href === "/alerts" && alerts > 0
            ? alerts
            : undefined,
    })),
  }));
}

function formatDockBadge(n: number): string {
  return n > 9 ? "9+" : String(n);
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onFlyoutOpenChange?: (open: boolean) => void;
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  onFlyoutOpenChange,
}: SidebarProps) {
  const pathname = usePathname();
  const flyoutId = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const { data: stockLevelsRaw } = useStockLevels();
  const { data: alertsRaw } = useAlerts();
  const stockLevels = (stockLevelsRaw || []) as StockLevel[];
  const alerts = (alertsRaw || []) as Alert[];
  const lowStock = stockLevels.filter((s) => s.status === "low" || s.status === "critical").length;
  const unack = alerts.filter((a) => !a.acknowledged).length;
  const navGroups = useNavGroups(lowStock, unack);
  const { can } = useAccess();
  const showSettings = can("settings");

  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActiveHref = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"));

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActiveHref(item.href));

  const handleMouseEnterGroup = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredGroupId(id);
  };

  const handleMouseLeaveSidebar = () => {
    if (mobileOpen) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredGroupId(null), 200);
  };

  const activeGroup = navGroups.find((g) => g.id === hoveredGroupId);
  const flyoutVisible = Boolean(activeGroup) || mobileOpen;

  useEffect(() => {
    onFlyoutOpenChange?.(Boolean(hoveredGroupId) && !mobileOpen);
  }, [hoveredGroupId, mobileOpen, onFlyoutOpenChange]);

  useEffect(() => {
    if (!mobileOpen) return;
    const current =
      navGroups.find((g) => g.items.some((item) => isActiveHref(item.href))) ?? navGroups[0];
    setHoveredGroupId(current.id);
  }, [mobileOpen, pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <div
        ref={dockRef}
        className={cn(
          "lf-sidebar-dock fixed left-0 top-0 z-40 flex h-screen transition-transform duration-300",
          "max-lg:-translate-x-full",
          mobileOpen && "max-lg:translate-x-0"
        )}
        onMouseLeave={handleMouseLeaveSidebar}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? "Menu de navigation" : undefined}
      >
        <aside className="lf-dock" aria-label="Navigation principale">
          <Link href="/dashboard" className="lf-dock-logo" onClick={onMobileClose} title="LeadFarm">
            <Leaf className="w-6 h-6 text-[var(--color-valley-green)]" strokeWidth={1.6} />
            <span className="lf-dock-dot" />
          </Link>

          <nav className="lf-dock-nav">
            {navGroups.map((group) => {
              const active = isGroupActive(group) || hoveredGroupId === group.id;
              const Icon = group.icon;
              const badgeLabel =
                group.badge != null && group.badge > 0
                  ? `${group.badge} notification(s) — ${group.label}`
                  : group.label;
              return (
                <button
                  key={group.id}
                  type="button"
                  title={group.label}
                  onMouseEnter={() => handleMouseEnterGroup(group.id)}
                  onFocus={() => handleMouseEnterGroup(group.id)}
                  onClick={() => handleMouseEnterGroup(group.id)}
                  className={cn("lf-dock-btn", active && "active")}
                  aria-expanded={hoveredGroupId === group.id}
                  aria-controls={flyoutId}
                  aria-label={badgeLabel}
                >
                  {active && <span className="lf-dock-indicator" aria-hidden />}
                  <Icon strokeWidth={1.6} className="w-5 h-5" />
                  {group.badge != null && group.badge > 0 && (
                    <span className="lf-dock-badge-num" aria-hidden>
                      {formatDockBadge(group.badge)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="lf-dock-footer">
            {showSettings && (
              <Link
                href="/settings"
                title="Paramètres"
                onClick={onMobileClose}
                className={cn("lf-dock-btn", pathname === "/settings" && "active")}
              >
                <Settings strokeWidth={1.6} className="w-5 h-5" />
              </Link>
            )}
            <Link
              href="/settings"
              className="lf-dock-avatar"
              title="Compte — Paramètres"
              onClick={onMobileClose}
            >
              AK
            </Link>
          </div>
        </aside>

        <aside
          id={flyoutId}
          className={cn("lf-flyout", flyoutVisible && "lf-flyout-open")}
          onMouseEnter={() => {
            if (activeGroup) handleMouseEnterGroup(activeGroup.id);
          }}
        >
          {activeGroup && (
            <>
              <div className="lf-flyout-head">
                <p className="lf-flyout-group mono">{activeGroup.label.toUpperCase()}</p>
                <h2 className="lf-flyout-title">{activeGroup.label}</h2>
              </div>

              <div className="lf-flyout-scroll">
                {activeGroup.items.map((item) => {
                  const ItemIcon = item.icon;
                  const active = isActiveHref(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn("lf-sb-link", active && "active")}
                    >
                      <ItemIcon strokeWidth={1.6} className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="badge">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="lf-flyout-tenant">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-forest-dew)] flex items-center justify-center shrink-0">
                    <Tractor className="w-4 h-4 text-[var(--color-valley-green)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--color-adaline-ink)] truncate">
                      {FARM_DISPLAY_NAME}
                    </p>
                    <p className="mono text-[9px] text-[var(--color-valley-green)] uppercase">
                      {SUPABASE_CONFIGURED ? "Cloud sync" : "Local"} · SBA
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
