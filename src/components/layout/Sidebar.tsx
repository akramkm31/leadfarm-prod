"use client";

import { useState, useRef, useEffect, useId, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAlerts, useStockLevels, SUPABASE_CONFIGURED } from "@/hooks/useData";
import type { Alert, StockLevel } from "@/lib/mock-data";
import { FARM_DISPLAY_NAME } from "@/lib/ux-labels";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
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
  Search,
  Users,
  FileText,
  Beaker,
  Settings,
  LogOut,
  Leaf,
  Tractor,
  Wheat,
  BarChart2,
  Sprout,
  ChevronDown,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import CommandPalette from "./CommandPalette";
import { useAlertsPanel } from "@/components/alerts/AlertsProvider";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number; section?: string };
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
  "/resultats": BarChart2,
  "/recoltes": Sprout,
};

function deriveInitials(email: string | null): string {
  if (!email) return "--";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : local.slice(0, 2).toUpperCase();
}

function useNavGroups(lowStock: number, alerts: number): NavGroup[] {
  const { profile } = useAccess();
  return useMemo(() => {
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
        section: item.section,
        badge:
          item.href === "/stock" && lowStock > 0
            ? lowStock
            : undefined,
      })),
    }));
  }, [profile, lowStock, alerts]);
}

function formatDockBadge(n: number): string {
  return n > 9 ? "9+" : String(n);
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onFlyoutOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  onFlyoutOpenChange,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const flyoutId = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const { data: stockLevelsRaw } = useStockLevels();
  const { data: alertsRaw } = useAlerts();
  const stockLevels = (stockLevelsRaw || []) as StockLevel[];
  const alerts = (alertsRaw || []) as Alert[];
  const lowStock = stockLevels.filter((s) => s.status === "low" || s.status === "critical").length;
  const unack = alerts.filter((a) => !a.acknowledged).length;
  const navGroups = useNavGroups(lowStock, unack);
  const { can } = useAccess();
  const showSettings = can("settings");
  const { openAlerts } = useAlertsPanel();

  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [flyoutExpanded, setFlyoutExpanded] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initials = deriveInitials(userEmail);

  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";
  const showAlerts = can("alerts");

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

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
    // Desktop: keep flyout open so navigation stays visible (not hover-only).
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredGroupId(null), 200);
  };

  const activeGroup = navGroups.find((g) => g.id === hoveredGroupId);
  const flyoutVisible = Boolean(activeGroup) || mobileOpen;

  useEffect(() => {
    onFlyoutOpenChange?.(Boolean(hoveredGroupId) && !mobileOpen);
  }, [hoveredGroupId, mobileOpen, onFlyoutOpenChange]);

  useEffect(() => {
    if (navGroups.length === 0) return;
    const current =
      navGroups.find((g) => g.items.some((item) => isActiveHref(item.href))) ?? navGroups[0];
    if (mobileOpen) {
      setHoveredGroupId(current.id);
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setHoveredGroupId(current.id);
    }
  }, [mobileOpen, pathname, navGroups]);

  useEffect(() => {
    setCollapsedSections(new Set());
    setFlyoutExpanded(false);
  }, [hoveredGroupId]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const platform = (navigator as any).userAgentData?.platform ?? navigator.platform ?? "";
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(platform));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }: { data: { session: { user?: { email?: string } } | null } }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setUserOpen(false);
        if (mobileOpen) onMobileClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {collapsed && (
        <button
          type="button"
          title="Afficher le menu"
          onClick={() => onCollapsedChange?.(false)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-5 h-10 rounded-r-lg bg-[var(--surface-pure,#fff)] border border-l-0 border-[var(--surface-recessed,#e5e5ea)] shadow-md hover:w-6 transition-all duration-200 text-[var(--text-secondary,#6e6e73)]"
        >
          <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      )}

      <div
        ref={dockRef}
        className={cn(
          "lf-sidebar-dock fixed left-0 top-0 z-40 flex h-screen transition-transform duration-300",
          "max-md:-translate-x-full",
          mobileOpen && "max-md:translate-x-0",
          collapsed && "md:-translate-x-[400px]"
        )}
        onMouseLeave={handleMouseLeaveSidebar}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? "Menu de navigation" : undefined}
      >
        <aside
          className={cn("lf-dock", userOpen && "lf-dock--account-open")}
          aria-label="Navigation principale"
        >
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
            <button
              type="button"
              className="lf-dock-btn"
              title="Masquer le menu"
              aria-label="Masquer le menu"
              onClick={() => onCollapsedChange?.(true)}
            >
              <PanelLeftClose strokeWidth={1.6} className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="lf-dock-btn"
              title={`Rechercher (${shortcutLabel})`}
              aria-label={`Rechercher (${shortcutLabel})`}
              onClick={() => setPaletteOpen(true)}
            >
              <Search strokeWidth={1.6} className="w-5 h-5" />
            </button>
            {showAlerts && (
              <button
                type="button"
                className="lf-dock-btn"
                title="Alertes"
                aria-label={
                  unack > 0 ? `Alertes — ${unack} non acquittée(s)` : "Alertes"
                }
                onClick={() => {
                  openAlerts();
                  onMobileClose?.();
                }}
              >
                <Bell strokeWidth={1.6} className="w-5 h-5" />
                {unack > 0 && (
                  <span className="lf-dock-badge-num" aria-hidden>
                    {formatDockBadge(unack)}
                  </span>
                )}
              </button>
            )}
            <div className="relative" ref={userRef}>
              <button
                type="button"
                className="lf-dock-avatar"
                title="Menu compte"
                aria-label="Menu compte"
                aria-expanded={userOpen}
                aria-haspopup="menu"
                onClick={() => setUserOpen((v) => !v)}
              >
                {initials}
              </button>
              {userOpen && (
                <div className="lf-dock-account-menu card-soft py-2 shadow-lg" role="menu">
                  {showSettings && (
                    <Link
                      href="/settings"
                      role="menuitem"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#f1f5e6]"
                      onClick={() => {
                        setUserOpen(false);
                        onMobileClose?.();
                      }}
                    >
                      <Settings className="w-4 h-4" />
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
        </aside>

        <aside
          id={flyoutId}
          className={cn("lf-flyout", flyoutVisible && "lf-flyout-open")}
          style={flyoutExpanded ? { width: 360 } : undefined}
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
                {(() => {
                  const sections: { label: string; items: typeof activeGroup.items }[] = [];
                  const seen = new Map<string, typeof activeGroup.items>();
                  for (const item of activeGroup.items) {
                    const key = item.section ?? "";
                    if (!seen.has(key)) { seen.set(key, []); sections.push({ label: key, items: seen.get(key)! }); }
                    seen.get(key)!.push(item);
                  }
                  return sections.map(({ label, items }, si) => {
                    const collapsed = label ? collapsedSections.has(label) : false;
                    return (
                      <div key={label || si} className={si > 0 ? "mt-2" : undefined}>
                        {label && (
                          <button
                            type="button"
                            onClick={() => setCollapsedSections(prev => {
                              const next = new Set(prev);
                              next.has(label) ? next.delete(label) : next.add(label);
                              return next;
                            })}
                            className="w-full flex items-center justify-between px-3 py-1 group hover:opacity-100 transition-opacity"
                          >
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary,#6e6e73)] opacity-60 group-hover:opacity-90 transition-opacity">
                              {label}
                            </span>
                            <ChevronDown
                              strokeWidth={2}
                              className={cn(
                                "w-3 h-3 text-[var(--text-secondary,#6e6e73)] opacity-40 group-hover:opacity-70 transition-all duration-200",
                                collapsed && "-rotate-90"
                              )}
                            />
                          </button>
                        )}
                        <div className={cn(
                          "grid transition-all duration-200",
                          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                        )}>
                          <div className="overflow-hidden">
                            {items.map((item) => {
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
                                  {item.href === "/treatments" && can("treatments.view") && !can("treatments.plan") && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 shrink-0">Lecture</span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
