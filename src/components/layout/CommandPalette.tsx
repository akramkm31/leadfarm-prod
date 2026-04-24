"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Package,
  FlaskConical,
  Truck,
  Map,
  Droplets,
  Zap,
  Users,
  FileText,
  Bell,
  Settings,
  CornerDownLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Command = {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: "Navigation" | "Stock" | "Terrain" | "Gestion";
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
};

const COMMANDS: Command[] = [
  { id: "dash", label: "Tableau de bord", hint: "Vue d'ensemble", href: "/dashboard", group: "Navigation", icon: LayoutDashboard, keywords: ["accueil", "home", "kpi"] },
  { id: "stock", label: "Gestion de Stock", hint: "Mouvements & inventaire", href: "/stock", group: "Stock", icon: Package, keywords: ["entree", "sortie", "mouvement", "inventaire"] },
  { id: "products", label: "Produits Phyto", hint: "Catalogue produits", href: "/products", group: "Stock", icon: FlaskConical, keywords: ["herbicide", "fongicide", "insecticide"] },
  { id: "suppliers", label: "Fournisseurs", hint: "Carnet d'adresses", href: "/suppliers", group: "Stock", icon: Truck, keywords: ["vendeur", "achat"] },
  { id: "parcelles", label: "Parcelles", hint: "Carte & sous-parcelles", href: "/parcelles", group: "Terrain", icon: Map, keywords: ["champ", "terrain", "carte"] },
  { id: "treatments", label: "Traitements", hint: "Sessions phytosanitaires", href: "/treatments", group: "Terrain", icon: Droplets, keywords: ["pulverisation", "traitement"] },
  { id: "live", label: "IoT Live", hint: "Tracteur temps réel", href: "/live", group: "Gestion", icon: Zap, keywords: ["gps", "capteur", "debit"] },
  { id: "operators", label: "Opérateurs", hint: "Équipe terrain", href: "/operators", group: "Gestion", icon: Users, keywords: ["agent", "personnel"] },
  { id: "reports", label: "Rapports", hint: "Exports & traçabilité", href: "/reports", group: "Gestion", icon: FileText, keywords: ["export", "csv", "pdf"] },
  { id: "alerts", label: "Alertes", hint: "Notifications système", href: "/alerts", group: "Gestion", icon: Bell, keywords: ["notification", "stock bas"] },
  { id: "settings", label: "Paramètres", hint: "Préférences compte", href: "/settings", group: "Gestion", icon: Settings, keywords: ["config", "profil"] },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => {
      const hay = `${c.label} ${c.hint} ${c.keywords?.join(" ") ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const handleSelect = (cmd: Command) => {
    router.push(cmd.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  };

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl glass-card overflow-hidden animate-page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-white/55 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page, un module..."
            className="flex-1 bg-transparent outline-none text-sm text-white/90 placeholder-white/40"
            aria-label="Recherche"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/55">
              Aucun résultat pour <span className="text-white/85">«{query}»</span>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  {group}
                </div>
                {items.map((cmd) => {
                  const globalIdx = filtered.indexOf(cmd);
                  const isActive = globalIdx === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      onClick={() => handleSelect(cmd)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        isActive
                          ? "bg-amber-500/15 text-amber-200"
                          : "text-white/75 hover:bg-white/[0.04]"
                      )}
                    >
                      <cmd.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-amber-300" : "text-white/55")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{cmd.label}</div>
                        <div className="text-[11px] text-white/55 truncate">{cmd.hint}</div>
                      </div>
                      {isActive && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.08] bg-black/30 text-[11px] text-white/55">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-[10px]">↑↓</kbd>
              naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-[10px]">⏎</kbd>
              ouvrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-[10px]">esc</kbd>
              fermer
            </span>
          </div>
          <span className="font-mono">LeadFarm</span>
        </div>
      </div>
    </div>
  );
}
