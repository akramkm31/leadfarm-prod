"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Repeat, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RotateCcw, Trash2, ExternalLink,
} from "lucide-react";
import { useMovements } from "@/hooks/useData";
import type { StockEntry } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { WidgetShell, WidgetEmpty } from "./WidgetShell";

const CATEGORY_LABEL: Record<string, string> = {
  entree_fournisseur: "Entrée fournisseur",
  entree_distributeur: "Entrée distributeur",
  sortie_traitement: "Sortie traitement",
  sortie_interne: "Sortie interne",
  transfert_externe: "Transfert",
  retour_parcelle: "Retour parcelle",
  perte_peremption: "Perte (péremption)",
};

function visual(m: StockEntry) {
  if (m.type === "transfer") return { Icon: ArrowLeftRight, cls: "text-blue-600 bg-blue-50" };
  if (m.type === "return") return { Icon: RotateCcw, cls: "text-emerald-600 bg-emerald-50" };
  if (m.movementCategory === "perte_peremption") return { Icon: Trash2, cls: "text-red-600 bg-red-50" };
  return m.quantity >= 0
    ? { Icon: ArrowDownLeft, cls: "text-emerald-600 bg-emerald-50" }
    : { Icon: ArrowUpRight, cls: "text-amber-600 bg-amber-50" };
}

export default function MovementsWidget({ bare = false }: { bare?: boolean }) {
  const { data } = useMovements();
  const movements = (data ?? []) as StockEntry[];

  const recent = useMemo(
    () => [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6),
    [movements]
  );

  return (
    <WidgetShell
      icon={<Repeat className="w-4 h-4" />}
      title="Mouvements récents"
      bare={bare}
      action={
        <Link href="/stock" className="text-[10px] font-bold text-[var(--color-valley-green)] hover:opacity-80 inline-flex items-center gap-0.5">
          Tout voir <ExternalLink className="w-3 h-3" />
        </Link>
      }
    >
      {recent.length === 0 ? (
        <WidgetEmpty icon={<Repeat className="w-7 h-7" />} label="Aucun mouvement récent" />
      ) : (
        <ul className="space-y-1.5">
          {recent.map((m) => {
            const { Icon, cls } = visual(m);
            const label = CATEGORY_LABEL[m.movementCategory] ?? m.movementCategory ?? m.type;
            const ref = m.supplierName || m.reference || m.transferDestination || m.notes || "";
            return (
              <li key={m.id} className="flex items-center gap-2.5">
                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cls)}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--color-adaline-ink)] truncate">{m.productName}</span>
                    <span className={cn("text-xs font-bold font-mono shrink-0", m.quantity >= 0 ? "text-emerald-600" : "text-amber-600")}>
                      {m.quantity >= 0 ? "+" : ""}{m.quantity} {m.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[9px] text-[var(--color-adaline-ink)]/45">
                    <span className="truncate">{label}{ref ? ` · ${ref}` : ""}</span>
                    <span className="shrink-0">{new Date(m.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}
