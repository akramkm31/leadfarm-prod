"use client";

import Link from "next/link";
import { Package, CalendarClock, MapPin, ArrowRight } from "lucide-react";
import { useTreatments } from "@/hooks/useData";
import { WidgetShell, WidgetEmpty } from "./WidgetShell";

interface TreatmentProductLike {
  productName: string;
  quantityUsed?: number;
  unit?: string;
}
interface TreatmentLike {
  id: string;
  parcelleName?: string;
  sousParcelleName?: string;
  status?: string;
  plannedDate?: string;
  products?: TreatmentProductLike[];
}

export default function PrepareWidget({ bare = false }: { bare?: boolean }) {
  const { data } = useTreatments();
  const treatments = (data ?? []) as TreatmentLike[];

  const upcoming = treatments
    .filter((t) => t.status === "planned" || t.status === "in_progress")
    .sort((a, b) => new Date(a.plannedDate ?? 0).getTime() - new Date(b.plannedDate ?? 0).getTime());

  return (
    <WidgetShell
      icon={<Package className="w-4 h-4" />}
      title="Produits à préparer"
      count={upcoming.length}
      countTone={upcoming.length ? "amber" : "green"}
      bare={bare}
    >
      {upcoming.length === 0 ? (
        <WidgetEmpty icon={<Package className="w-7 h-7" />} label="Aucun traitement planifié à préparer" />
      ) : (
        <ul className="space-y-2">
          {upcoming.slice(0, 4).map((t) => (
            <li key={t.id}>
              <Link
                href={`/stock?treatment=${t.id}`}
                className="block px-2.5 py-2 rounded-lg border border-[var(--color-stone-moss)] bg-white/50 hover:bg-white/80 transition-colors"
              >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-adaline-ink)] min-w-0">
                  <MapPin className="w-3 h-3 text-[var(--color-valley-green)] shrink-0" />
                  <span className="truncate">{t.sousParcelleName || t.parcelleName || "Parcelle"}</span>
                </span>
                {t.plannedDate && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-adaline-ink)]/55 shrink-0">
                    <CalendarClock className="w-3 h-3" />
                    {new Date(t.plannedDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {(t.products ?? []).length === 0 ? (
                  <span className="text-[10px] text-[var(--color-adaline-ink)]/40 italic">Produits non renseignés</span>
                ) : (
                  (t.products ?? []).map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-forest-dew)] text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/15"
                    >
                      {p.productName}
                      {p.quantityUsed != null && (
                        <span className="font-bold">· {p.quantityUsed} {p.unit ?? ""}</span>
                      )}
                    </span>
                  ))
                )}
              </div>
              </Link>
            </li>
          ))}
          {upcoming.length > 4 && (
            <p className="text-[10px] text-[var(--color-adaline-ink)]/40 text-center">
              +{upcoming.length - 4} autres traitements
            </p>
          )}
          <Link
            href="/stock"
            className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-[var(--color-valley-green)] hover:underline"
          >
            Gérer le stock
            <ArrowRight className="w-3 h-3" />
          </Link>
        </ul>
      )}
    </WidgetShell>
  );
}
