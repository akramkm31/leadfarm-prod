"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { crumbsFromPathname } from "@/lib/page-crumbs";
import { cn } from "@/lib/utils";
import { useHeaderActionsSlot } from "./HeaderActions";
import { useHeaderMeta } from "./HeaderMeta";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const crumbs = crumbsFromPathname(pathname || "/dashboard");
  const headerActions = useHeaderActionsSlot();
  const headerMeta = useHeaderMeta();
  const showMagHeader = Boolean(headerMeta?.title);

  return (
    <header className={cn("lf-topbar sticky top-0 z-30", showMagHeader && "lf-topbar--mag")}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-[#f1f5e6]"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {showMagHeader ? (
          <div className="lf-hdr-title min-w-0">
            <h2 className="lf-hdr-title-main">{headerMeta!.title}</h2>
            {headerMeta!.subtitle && <p className="lf-hdr-title-meta">{headerMeta!.subtitle}</p>}
          </div>
        ) : (
          !isDashboard && (
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
          )
        )}
      </div>
      {headerActions && <div className="lf-topbar-right">{headerActions}</div>}
    </header>
  );
}
