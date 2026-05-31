"use client";

import { useMemo, type CSSProperties } from "react";
import { MapPin, X } from "lucide-react";
import type { Parcelle } from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";

export type ParcelleNavItem = {
  id: string;
  name: string;
  color?: string;
  parentName?: string;
  areaHectares?: number;
};

export function flattenParcellesForNav(parcelles: Parcelle[]): ParcelleNavItem[] {
  const items: ParcelleNavItem[] = [];
  for (const p of parcelles) {
    items.push({
      id: p.id,
      name: p.name?.trim() || p.cropType || "Parcelle",
      color: p.color,
      areaHectares: p.areaHectares,
    });
    for (const c of p.children || []) {
      items.push({
        id: c.id,
        name: c.name?.trim() || c.cropType || "Sous-parcelle",
        color: c.color || p.color,
        parentName: p.name || p.cropType,
        areaHectares: c.areaHectares,
      });
    }
  }
  return items;
}

type ParcelleQuickNavProps = {
  parcelles: Parcelle[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClear?: () => void;
  variant?: "light" | "dark";
  className?: string;
  hint?: string;
};

export default function ParcelleQuickNav({
  parcelles,
  selectedId,
  onSelect,
  onClear,
  variant = "light",
  className,
  hint,
}: ParcelleQuickNavProps) {
  const items = useMemo(() => flattenParcellesForNav(parcelles), [parcelles]);

  if (items.length === 0) return null;

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "parcelle-quick-nav shrink-0",
        isDark ? "parcelle-quick-nav--dark" : "parcelle-quick-nav--light",
        className
      )}
    >
      <div className="parcelle-quick-nav__head">
        <span className="parcelle-quick-nav__label">
          <MapPin className="w-3 h-3" aria-hidden />
          Parcelles
        </span>
        {hint && <span className="parcelle-quick-nav__hint">{hint}</span>}
        {selectedId && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="parcelle-quick-nav__clear"
            aria-label="Afficher toutes les parcelles"
          >
            <X className="w-3 h-3" />
            Toutes
          </button>
        )}
      </div>
      <div className="parcelle-quick-nav__track" role="tablist" aria-label="Sélection rapide des parcelles">
        {items.map((item) => {
          const selected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              title={
                item.parentName
                  ? `${item.name} · ${item.parentName}${item.areaHectares != null ? ` · ${formatHectares(item.areaHectares)}` : ""}`
                  : `${item.name}${item.areaHectares != null ? ` · ${formatHectares(item.areaHectares)}` : ""}`
              }
              onClick={() => onSelect(item.id)}
              className={cn("parcelle-quick-nav__chip", selected && "parcelle-quick-nav__chip--active")}
              style={
                selected
                  ? ({
                      "--chip-color": item.color || "var(--color-valley-green)",
                    } as CSSProperties)
                  : undefined
              }
            >
              <span
                className="parcelle-quick-nav__dot"
                style={{ backgroundColor: item.color || "var(--color-valley-green)" }}
                aria-hidden
              />
              <span className="parcelle-quick-nav__chip-name">{item.name}</span>
              {item.parentName && (
                <span className="parcelle-quick-nav__chip-sub">{item.parentName}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
