"use client";

import Link from "next/link";
import {
  ChevronRight,
  Droplets,
  Filter,
  GitBranch,
  History,
  Info,
  Layers,
  MapPin,
  Pencil,
  Trash2,
  Wheat,
  X,
} from "lucide-react";
import {
  cultureTypeLabels,
  irrigationLabels,
  type CultureType,
  type Parcelle,
} from "@/lib/mock-data";
import { formatHectares } from "@/lib/utils";

type ParcelleDetailDrawerProps = {
  parcelle: Parcelle;
  parcelles: Parcelle[];
  treatments: Record<string, unknown>[];
  onClose: () => void;
  onSelectChild: (child: Parcelle) => void;
  onDrawSubParcelle: () => void;
  onHistory: () => void;
  onFilterTreatments: () => void;
  onSchedule: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ParcelleDetailDrawer({
  parcelle,
  parcelles,
  treatments,
  onClose,
  onSelectChild,
  onDrawSubParcelle,
  onHistory,
  onFilterTreatments,
  onSchedule,
  onEdit,
  onDelete,
}: ParcelleDetailDrawerProps) {
  const treatmentCount = treatments.filter((t) => {
    const row = t as Record<string, unknown>;
    return (
      row.parcelleName === parcelle.name ||
      row.parcelleId === parcelle.id ||
      row.sousParcelleId === parcelle.id
    );
  }).length;

  return (
    <aside className="parc-map-drawer" aria-label="Fiche parcelle">
      <div className="parc-map-drawer-inner" key={parcelle.id}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-5 h-5 rounded-lg border-2 shrink-0"
                style={{
                  borderColor: parcelle.color || "#6b9e7a",
                  backgroundColor: `${parcelle.color || "#6b9e7a"}20`,
                }}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-mist-gray)]">
                  Parcelle
                </p>
                <h3 className="text-lg font-bold text-[var(--color-adaline-ink)] truncate">
                  {parcelle.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/trace/${parcelle.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/10 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Traçabilité
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer la fiche parcelle"
                className="p-1.5 rounded-lg hover:bg-[var(--color-stone-moss)]/40 transition-colors text-[var(--color-adaline-ink)]/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!parcelle.parentId && (
            <button
              type="button"
              onClick={onDrawSubParcelle}
              className="w-full mb-5 glass-button py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
              style={{ borderColor: `${parcelle.color}55` }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Dessiner une sous-parcelle
            </button>
          )}

          <SectionTitle icon={Wheat} title="Culture" />
          <div className="space-y-0 mb-5">
            <DetailRow
              label="Type de culture"
              value={cultureTypeLabels[parcelle.cultureType as CultureType] || parcelle.cultureType || "—"}
            />
            <DetailRow label="Culture" value={parcelle.cropType || "—"} />
            <DetailRow label="Variété" value={parcelle.variete || "—"} highlight="amber" />
            <DetailRow label="Surface" value={formatHectares(parcelle.areaHectares)} highlight="amber" />
            <DetailRow label="Sol" value={parcelle.soilType || "—"} />
            <DetailRow
              label="Irrigation"
              value={irrigationLabels[parcelle.irrigation] || parcelle.irrigation || "—"}
            />
            {parcelle.densitePlantation && (
              <DetailRow
                label="Densité plantation"
                value={`${parcelle.densitePlantation} ${parcelle.densiteUnit}`}
                highlight="cyan"
              />
            )}
            {parcelle.dateImplantation && (
              <DetailRow
                label="Date implantation"
                value={new Date(parcelle.dateImplantation).toLocaleDateString("fr-FR")}
              />
            )}
          </div>

          <SectionTitle icon={MapPin} title="Localisation" />
          <div className="space-y-0 mb-5">
            <DetailRow label="Site" value={parcelle.site || "—"} />
            <DetailRow label="Zone" value={parcelle.zone || "—"} />
            <DetailRow label="Secteur" value={parcelle.secteur || "—"} />
            {parcelle.altitude && <DetailRow label="Altitude" value={`${parcelle.altitude} m`} />}
            {parcelle.parentId && (
              <DetailRow
                label="Parcelle parente"
                value={parcelles.find((p) => p.id === parcelle.parentId)?.name || "—"}
              />
            )}
          </div>

          {!parcelle.parentId && parcelle.children && parcelle.children.length > 0 && (
            <>
              <SectionTitle icon={Layers} title={`Sous-parcelles (${parcelle.children.length})`} />
              <div className="space-y-1.5 mb-5">
                {parcelle.children.map((child) => (
                  <button
                    key={`sp-${child.id}`}
                    type="button"
                    onClick={() => onSelectChild(child)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white border border-[var(--color-stone-moss)]/80 hover:border-[var(--color-valley-green)]/30 hover:bg-[var(--color-forest-dew)]/50 transition-all text-left group"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded shrink-0"
                      style={{
                        backgroundColor: child.color || "#6b9e7a",
                        border: `1.5px solid ${child.color || "#6b9e7a"}`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-[var(--color-adaline-ink)] block truncate">
                        {child.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-mist-gray)]">
                        {child.variete || child.cropType} · {formatHectares(child.areaHectares)}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--color-mist-gray)] group-hover:text-[var(--color-valley-green)] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}

          <SectionTitle icon={Droplets} title="Traitements" />
          <div className="space-y-0 mb-4">
            <DetailRow label="Nombre total" value={String(parcelle.treatmentCount ?? 0)} />
            <DetailRow
              label="Dernier traitement"
              value={
                parcelle.lastTreatmentDate
                  ? new Date(parcelle.lastTreatmentDate).toLocaleDateString("fr-FR")
                  : "Jamais"
              }
            />
          </div>

          <button
            type="button"
            onClick={onHistory}
            className="w-full mb-3 flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-valley-green)]/25 bg-[var(--color-forest-dew)] hover:bg-[var(--green-010)] transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-[var(--color-valley-green)]" />
              <span className="text-sm font-semibold text-[var(--color-valley-green)]">
                Voir l&apos;historique complet
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-valley-green)] bg-[var(--color-valley-green)]/10 px-2 py-0.5 rounded-full">
                {treatmentCount} traitements
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--color-valley-green)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={onFilterTreatments}
            className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-stone-moss)] bg-white hover:bg-[var(--color-forest-dew)]/40 transition-colors group text-left"
          >
            <div className="flex items-center gap-2.5">
              <Filter className="w-4 h-4 text-[var(--color-mist-gray)]" />
              <span className="text-sm font-semibold text-[var(--color-adaline-ink)]/80">
                Filtrer l&apos;historique de cette zone
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-mist-gray)] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {parcelle.observations && (
            <>
              <SectionTitle icon={Info} title="Observations" />
              <p className="text-xs text-[var(--color-mist-gray)] leading-relaxed mb-5">
                {parcelle.observations}
              </p>
            </>
          )}

          <button
            type="button"
            onClick={onSchedule}
            className="w-full glass-button py-2.5 text-sm mt-2 flex items-center justify-center gap-2"
          >
            <Droplets className="w-4 h-4" />
            Planifier un traitement
          </button>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 py-2 text-xs font-medium rounded-xl border border-[var(--color-stone-moss)] bg-white text-[var(--color-adaline-ink)]/70 hover:bg-[var(--color-forest-dew)] transition-colors flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 py-2 text-xs font-medium rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Info; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <Icon className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-mist-gray)]">{title}</h4>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "amber" | "cyan";
}) {
  const valueCls =
    highlight === "amber"
      ? "text-amber-700"
      : highlight === "cyan"
        ? "text-cyan-700"
        : "text-[var(--color-adaline-ink)]";
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-stone-moss)]/50 last:border-0">
      <span className="text-xs text-[var(--color-mist-gray)]">{label}</span>
      <span className={`text-xs font-semibold ${valueCls}`}>{value}</span>
    </div>
  );
}
