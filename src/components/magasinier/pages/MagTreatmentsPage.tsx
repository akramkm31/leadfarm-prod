"use client";

import { useMemo, useState } from "react";
import { Eye, Lock, Plus, SprayCan } from "lucide-react";
import { useTreatments } from "@/hooks/useData";
import type { Treatment } from "@/lib/mock-data";

type TreatmentRow = Treatment & { culture?: string; materiel?: string };
import {
  MagPage,
  MagActionRow,
  MagBtn,
  MagNotice,
  MagBadge,
  MagPill,
  MagEmpty,
} from "@/components/magasinier/ui";
import { MAG_TREAT_STATUS, formatMagDate } from "@/lib/magasinier/helpers";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { NewEntryModal, ConsommationModal } from "@/app/stock/stock-modals";
import { useProducts, useStockLevels, useParcelles } from "@/hooks/useData";
import type { PhytoProduct, StockLevel, Parcelle } from "@/lib/mock-data";

export default function MagTreatmentsPage() {
  const { data, loading, refetch } = useTreatments();
  const { data: productsRaw } = useProducts();
  const { data: stockRaw } = useStockLevels();
  const { data: parcellesRaw } = useParcelles();
  const treatments = (data ?? []) as TreatmentRow[];
  const products = (productsRaw ?? []) as PhytoProduct[];
  const stockLevels = (stockRaw ?? []) as StockLevel[];
  const parcelles = (parcellesRaw ?? []) as Parcelle[];
  const [modal, setModal] = useState<"consume" | null>(null);

  const sorted = useMemo(
    () =>
      [...treatments].sort(
        (a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime()
      ),
    [treatments]
  );

  if (loading) return <PageSkeleton />;

  return (
    <MagPage>
      <MagActionRow>
        <MagBtn disabled>
          <Plus className="w-4 h-4" />
          Planifier
        </MagBtn>
      </MagActionRow>

      <MagNotice tone="blue" icon={<Eye className="w-4 h-4" />}>
        <strong>Accès lecture.</strong> Vous consultez le planning pour préparer les sorties de magasin.
        La création, modification, validation et l&apos;exécution des traitements sont gérées par le directeur
        d&apos;exploitation.
      </MagNotice>

      <div className="mag-card--flat">
        <div className="mag-table-wrap">
          <table className="mag-table">
            <thead>
              <tr>
                <th>Parcelle</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Produits à préparer</th>
                <th>Opérateur</th>
                <th>Matériel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <MagEmpty icon={<SprayCan className="w-8 h-8 opacity-30" />} title="Aucun traitement" />
                  </td>
                </tr>
              ) : (
                sorted.map((t) => {
                  const st = MAG_TREAT_STATUS[t.status] ?? { label: t.status, tone: "gray" as const };
                  const canPrepare =
                    (t.status === "planned" || t.status === "in_progress") && (t.products?.length ?? 0) > 0;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{t.sousParcelleName || t.parcelleName}</div>
                        <div className="mag-muted" style={{ fontSize: 11 }}>
                          {t.culture || t.type}
                        </div>
                      </td>
                      <td className="mag-mono">{formatMagDate(t.plannedDate)}</td>
                      <td>
                        <MagBadge tone={st.tone}>{st.label}</MagBadge>
                      </td>
                      <td>
                        {(t.products ?? []).length === 0 ? (
                          <span className="mag-muted" style={{ fontStyle: "italic" }}>
                            Produits non renseignés
                          </span>
                        ) : (
                          <div className="mag-row" style={{ gap: 5, flexWrap: "wrap" }}>
                            {(t.products ?? []).map((p, i) => (
                              <MagPill key={i} dose={p.quantityUsed != null ? `${p.quantityUsed} ${p.unit ?? ""}` : undefined}>
                                {p.productName}
                              </MagPill>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>{t.operatorName || "—"}</td>
                      <td className="mag-muted">{t.materiel || "—"}</td>
                      <td>
                        {canPrepare ? (
                          <MagBtn sm primary onClick={() => setModal("consume")}>
                            Préparer
                          </MagBtn>
                        ) : (
                          <MagBtn sm disabled>
                            <Lock className="w-3 h-3" />
                          </MagBtn>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "consume" && (
        <ConsommationModal
          products={products}
          parcelles={parcelles}
          stockLevels={stockLevels}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refetch();
            setModal(null);
          }}
        />
      )}
    </MagPage>
  );
}
