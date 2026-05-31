"use client";

import { useMemo } from "react";
import {
  X,
  Droplets,
  Leaf,
  Sprout,
  Bug,
  Waves,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { Parcelle } from "@/lib/mock-data";
import { getProp, STATUS_LABELS, TYPE_LABELS } from "@/components/map/dashboard-map-utils";

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { color: string; bg: string; icon: React.FC<{ size: number }> }> = {
  pulverisation: { color: "#2d6b3f", bg: "#e8f5ec", icon: ({ size }) => <Droplets width={size} height={size} strokeWidth={2} /> },
  desherbage:    { color: "#8b6914", bg: "#fdf3dc", icon: ({ size }) => <Leaf     width={size} height={size} strokeWidth={2} /> },
  fertilisation: { color: "#1a5f7a", bg: "#dceef7", icon: ({ size }) => <Sprout   width={size} height={size} strokeWidth={2} /> },
  fongicide:     { color: "#7a1a1a", bg: "#f7dcdc", icon: ({ size }) => <Bug      width={size} height={size} strokeWidth={2} /> },
  irrigation:    { color: "#1a4a7a", bg: "#dce8f7", icon: ({ size }) => <Waves    width={size} height={size} strokeWidth={2} /> },
};

const DEFAULT_META = TYPE_META.pulverisation;

const STATUS_PILL: Record<string, { cls: string; icon: React.ReactNode }> = {
  completed:  { cls: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 width={8} height={8} /> },
  termine:    { cls: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 width={8} height={8} /> },
  in_progress:{ cls: "bg-amber-100  text-amber-800",   icon: <Clock        width={8} height={8} /> },
  en_cours:   { cls: "bg-amber-100  text-amber-800",   icon: <Clock        width={8} height={8} /> },
  planned:    { cls: "bg-stone-100  text-stone-600",   icon: <AlertCircle  width={8} height={8} /> },
  planifie:   { cls: "bg-stone-100  text-stone-600",   icon: <AlertCircle  width={8} height={8} /> },
  cancelled:  { cls: "bg-red-100    text-red-700",     icon: <XCircle      width={8} height={8} /> },
  annule:     { cls: "bg-red-100    text-red-700",     icon: <XCircle      width={8} height={8} /> },
};

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  parcelle: Parcelle;
  treatments: Record<string, unknown>[];
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ParcelleHistoryPanel({ parcelle, treatments, onClose }: Props) {
  const sorted = useMemo(
    () =>
      [...treatments].sort((a, b) => {
        const da = String(getProp(a, "plannedDate", "planned_date") || "");
        const db = String(getProp(b, "plannedDate", "planned_date") || "");
        return new Date(db).getTime() - new Date(da).getTime();
      }),
    [treatments]
  );

  const stats = useMemo(
    () => ({
      total: sorted.length,
      done: sorted.filter((t) => {
        const s = String(getProp(t, "status", "status") || "");
        return s === "completed" || s === "termine";
      }).length,
      planned: sorted.filter((t) => {
        const s = String(getProp(t, "status", "status") || "");
        return s === "planned" || s === "planifie";
      }).length,
    }),
    [sorted]
  );

  return (
    <div
      className="flex flex-col h-full border-l border-[var(--color-stone-moss)]/40 bg-white overflow-hidden"
      style={{ animation: "panelSlideIn 0.26s cubic-bezier(0.16,1,0.3,1) forwards" }}
    >
      <style>{`
        @keyframes panelSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ph-row { animation: rowIn 0.2s ease forwards; opacity: 0; }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: parcelle.color + "12", borderBottom: `2px solid ${parcelle.color}28` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow"
            style={{ background: parcelle.color }}
          />
          <div className="min-w-0">
            <p className="text-[12px] font-bold truncate leading-tight" style={{ color: parcelle.color }}>
              {parcelle.name}
            </p>
            <p className="text-[9px] text-[var(--color-adaline-ink)]/45 uppercase tracking-wide font-medium mt-px">
              {parcelle.areaHectares} ha · {parcelle.cropType}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/5 text-[var(--color-adaline-ink)]/35 hover:text-[var(--color-adaline-ink)] transition-colors flex-shrink-0"
        >
          <X width={12} height={12} />
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 border-b border-[var(--color-stone-moss)]/20 flex-shrink-0">
        {[
          { n: stats.total,   label: "Interventions" },
          { n: stats.done,    label: "Terminées",   cls: stats.done > 0 ? "text-emerald-700" : "" },
          { n: stats.planned, label: "Planifiées",  cls: stats.planned > 0 ? "text-amber-700" : "" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-2.5 px-1 border-r last:border-r-0 border-[var(--color-stone-moss)]/15">
            <span className={`text-[16px] font-bold leading-none text-[var(--color-adaline-ink)] ${s.cls ?? ""}`}>{s.n}</span>
            <span className="text-[8px] text-[var(--color-adaline-ink)]/40 font-medium text-center mt-1 leading-none">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 gap-2 text-center">
            <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center">
              <Leaf width={16} height={16} className="text-stone-300" />
            </div>
            <p className="text-[10px] text-stone-400 leading-relaxed">
              Aucune intervention<br />enregistrée pour cette zone
            </p>
          </div>
        ) : (
          <div className="relative">
            {sorted.map((t, i) => {
              const type = String(getProp(t, "type", "type") || "");
              const rawStatus = String(getProp(t, "status", "status") || "");
              const meta = TYPE_META[type] ?? DEFAULT_META;
              const pill = STATUS_PILL[rawStatus] ?? { cls: "bg-stone-100 text-stone-600", icon: <AlertCircle width={8} height={8} /> };
              const dateRaw = getProp(t, "plannedDate", "planned_date");
              const date = dateRaw
                ? new Date(String(dateRaw)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              const operator = String(getProp(t, "operatorName", "operator_name") || "");
              const rawProducts = (getProp(t, "products", "products") as unknown[]) ?? (getProp(t, "treatment_products", "treatment_products") as unknown[]) ?? [];
              const products = Array.isArray(rawProducts) ? rawProducts : [];
              const TypeIconEl = meta.icon;

              return (
                <div
                  key={String(t.id ?? i)}
                  className="ph-row relative flex gap-2.5 pb-4"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  {/* spine */}
                  {i < sorted.length - 1 && (
                    <div
                      className="absolute left-[12px] top-[24px] bottom-0 w-px"
                      style={{ background: `${meta.color}20` }}
                    />
                  )}

                  {/* icon dot */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-[25px] h-[25px] rounded-full flex items-center justify-center ring-2 ring-white shadow-sm"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <TypeIconEl size={10} />
                    </div>
                  </div>

                  {/* body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[var(--color-adaline-ink)] leading-tight">
                          {TYPE_LABELS[type] || type || "Traitement"}
                        </p>
                        <p className="text-[9px] text-[var(--color-adaline-ink)]/45 font-mono mt-0.5">{date}</p>
                      </div>
                      <span className={`flex items-center gap-0.5 text-[7.5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${pill.cls}`}>
                        {pill.icon}
                        {STATUS_LABELS[rawStatus] || rawStatus}
                      </span>
                    </div>

                    {operator && (
                      <p className="text-[9px] text-[var(--color-adaline-ink)]/50 mt-1 truncate">
                        👤 {operator}
                      </p>
                    )}

                    {products.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {products.slice(0, 3).map((p, pi) => {
                          const row = p as Record<string, unknown>;
                          const nested = row.products as Record<string, unknown> | undefined;
                          const name = String(row.productName || row.tradeName || nested?.trade_name || "Produit");
                          return (
                            <span
                              key={pi}
                              className="text-[8px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {name}
                            </span>
                          );
                        })}
                        {products.length > 3 && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                            +{products.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[var(--color-stone-moss)]/20 px-3 py-2.5 flex items-center justify-between bg-[#fafaf9]">
        <a
          href={`/trace/${encodeURIComponent(parcelle.id)}`}
          className="flex items-center gap-1 text-[9.5px] font-semibold text-[var(--color-valley-green)] hover:underline"
        >
          Traçabilité
          <ExternalLink width={9} height={9} />
        </a>
        <a
          href={`/parcelles?select=${encodeURIComponent(parcelle.id)}`}
          className="text-[9.5px] font-bold bg-[var(--color-valley-green)] text-white px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
        >
          Fiche Parcelle →
        </a>
      </div>
    </div>
  );
}
