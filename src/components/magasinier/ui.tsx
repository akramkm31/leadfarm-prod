"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MagPage({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={cn("mag-page", narrow && "max-w-[820px]")}>{children}</div>
  );
}

export function MagToolbar({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  if (!title && !actions) return null;
  if (!title) return <MagActionRow>{actions}</MagActionRow>;
  return (
    <div className="mag-toolbar">
      <div>
        <h1 className="mag-toolbar-title">{title}</h1>
        {subtitle && <p className="mag-toolbar-sub">{subtitle}</p>}
      </div>
      {actions && <div className="mag-toolbar-actions">{actions}</div>}
    </div>
  );
}

export function MagActionRow({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="mag-action-row">{children}</div>;
}

export function MagPill({ children, dose }: { children: ReactNode; dose?: string }) {
  return (
    <span className="mag-pill">
      {children}
      {dose && <span className="mag-pill-dose">{dose}</span>}
    </span>
  );
}

export function MagBtn({
  children,
  primary,
  sm,
  disabled,
  onClick,
  type = "button",
  className,
  style,
}: {
  children: ReactNode;
  primary?: boolean;
  sm?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={cn(
        "mag-btn",
        primary && "mag-btn--primary",
        sm && "mag-btn--sm",
        disabled && "mag-btn--disabled",
        className
      )}
    >
      {children}
    </button>
  );
}

export function MagKpi({
  label,
  value,
  unit,
  sub,
  subTone = "flat",
  hero,
  valueColor,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  subTone?: "up" | "warn" | "down" | "flat";
  hero?: boolean;
  valueColor?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("mag-kpi", hero && "mag-kpi--hero")}>
      <div className="mag-kpi-label">
        {icon}
        {label}
      </div>
      <div className="mag-kpi-val" style={valueColor ? { color: valueColor } : undefined}>
        {value}
        {unit && <span className="mag-kpi-unit">{unit}</span>}
      </div>
      {sub && <span className={cn("mag-kpi-sub", `mag-kpi-sub--${subTone}`)}>{sub}</span>}
    </div>
  );
}

export function MagTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mag-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={cn("mag-tab", active === t.id && "mag-tab--active")}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && <span className="mag-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function MagChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={cn("mag-chip", active && "mag-chip--active")} onClick={onClick}>
      {children}
    </button>
  );
}

export function MagBadge({
  tone = "gray",
  children,
  dot = true,
}: {
  tone?: "green" | "red" | "amber" | "blue" | "violet" | "gray";
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={cn("mag-badge", `mag-badge--${tone}`)}>
      {dot && <span className="mag-badge-dot" aria-hidden />}
      {children}
    </span>
  );
}

export function MagNotice({
  tone = "blue",
  icon,
  children,
}: {
  tone?: "blue" | "amber";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("mag-notice", `mag-notice--${tone}`)}>
      {icon && <span className="mag-notice-icon">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

export function MagEmpty({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="mag-empty">
      {icon}
      <div className="mag-empty-title">{title}</div>
      {sub && <div className="mag-empty-sub">{sub}</div>}
    </div>
  );
}

export function MagGauge({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mag-gauge">
      <div className="mag-gauge-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export function MagCardFlat({ children }: { children: ReactNode }) {
  return <div className="mag-card--flat">{children}</div>;
}

export function MagCardHead({ title, icon, right }: { title: string; icon?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mag-card-head">
      <span className="mag-card-title">
        {icon}
        {title}
      </span>
      {right}
    </div>
  );
}
