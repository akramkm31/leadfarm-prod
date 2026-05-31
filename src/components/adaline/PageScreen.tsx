import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageScreen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("lf-screen screen", className)}>{children}</div>;
}

export function PageHero({
  eyebrow,
  title,
  lede,
  faded,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  faded?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className={cn(aside ? "dash-hero" : "page-hero")}>
      <div>
        {eyebrow && <div className="page-eyebrow mono">{eyebrow}</div>}
        <h1 className={aside ? "dash-title" : "page-title"}>{title}</h1>
        {faded && (
          <p className={cn("dash-title-faded mt-1 text-base", !aside && "page-lede !mt-2")}>
            {faded}
          </p>
        )}
        {lede && <p className="page-lede">{lede}</p>}
        {actions && (
          <div className={cn("dash-actions", !aside && "page-actions")}>{actions}</div>
        )}
      </div>
      {aside && <div className="dash-hero-ill">{aside}</div>}
    </div>
  );
}

export function DashCard({
  eyebrow,
  title,
  action,
  children,
  className,
  bodyClassName,
  scrollBody,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  scrollBody?: boolean;
}) {
  return (
    <div className={cn("dash-card", className)}>
      <div className="dash-card-head">
        <div>
          {eyebrow && <div className="dash-card-eyebrow mono">{eyebrow}</div>}
          <h3 className="dash-card-title">{title}</h3>
        </div>
        {action}
      </div>
      <div
        className={cn(
          "dash-card-body",
          scrollBody && "dash-card-scroll",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  trend?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-lbl mono">{label}</div>
      <div className="kpi-card-val">
        {value}
        {unit && <span className="kpi-card-unit"> {unit}</span>}
      </div>
      {trend && <div className={cn("kpi-card-trend", tone)}>{trend}</div>}
    </div>
  );
}

export function AdalineButton({
  variant = "tertiary",
  href,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "tertiary" | "secondary";
  href?: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    "lf-btn",
    variant === "primary" && "lf-btn-primary",
    variant === "tertiary" && "lf-btn-tertiary",
    variant === "secondary" && "lf-btn-secondary",
    className
  );

  if (href) {
    const external = href.startsWith("http");
    if (external) {
      return (
        <a href={href} className={cls}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}

export function StatusPill({
  label,
  variant = "planned",
}: {
  label: string;
  variant?: "treating" | "planned" | "done" | "warn";
}) {
  return (
    <span className={cn("status-pill", variant)}>
      <span className="dot" />
      {label}
    </span>
  );
}
