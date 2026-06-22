"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ShoppingCart, ClipboardList } from "lucide-react";
import { fetchLfNeeds, type LfNeed } from "@/lib/lechehab/besoins";
import {
  MagPage,
  MagActionRow,
  MagBtn,
  MagChip,
  MagBadge,
  MagCardFlat,
  MagCardHead,
  MagKpi,
  MagEmpty,
} from "@/components/magasinier/ui";
import { formatMagQty } from "@/lib/magasinier/helpers";
import { downloadCSV } from "@/lib/export-csv";
import { PageSkeleton } from "@/components/ui/Skeleton";

const CATEGORY_LABEL: Record<string, string> = {
  FONGICIDE: "Fongicide",
  HERBICIDE: "Herbicide",
  INSECTICIDE: "Insecticide",
  ENGRAIS: "Engrais",
  FER: "Fer chélaté",
  ACIDE: "Acide",
  DORMANCE: "Dormance",
  HORMONE: "Hormone",
  AUTRE: "Autre",
};

const CATEGORY_TONE: Record<string, "green" | "red" | "amber" | "blue" | "violet" | "gray"> = {
  FONGICIDE: "green",
  INSECTICIDE: "red",
  HERBICIDE: "amber",
  ENGRAIS: "blue",
  FER: "violet",
  ACIDE: "amber",
  DORMANCE: "blue",
  AUTRE: "gray",
};

export default function MagBesoinsPage() {
  const [needs, setNeeds] = useState<LfNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    fetchLfNeeds()
      .then((n) => !cancelled && setNeeds(n))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    needs.forEach((n) => s.add(n.category));
    return Array.from(s).sort();
  }, [needs]);

  const filtered = useMemo(
    () => (cat === "ALL" ? needs : needs.filter((n) => n.category === cat)),
    [needs, cat]
  );

  const totalByUnit = useMemo(() => {
    const m: Record<string, number> = {};
    needs.forEach((n) => { m[n.unit] = (m[n.unit] ?? 0) + (n.quantity_needed || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [needs]);

  const handleExport = () =>
    downloadCSV(
      needs.map((n) => ({
        categorie: n.category,
        produit: n.product_label ?? "",
        matiere_active: n.active_ingredient_text ?? "",
        quantite: n.quantity_needed,
        unite: n.unit,
        campagne: n.campaign_year ?? 2026,
      })),
      [
        { key: "categorie", label: "Catégorie" },
        { key: "produit", label: "Produit" },
        { key: "matiere_active", label: "Matière active" },
        { key: "quantite", label: "Quantité" },
        { key: "unite", label: "Unité" },
        { key: "campagne", label: "Campagne" },
      ],
      `besoins_appro_${new Date().toISOString().slice(0, 10)}.csv`
    );

  if (loading) return <PageSkeleton />;

  return (
    <MagPage>
      <MagActionRow>
        <MagBtn onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export CSV
        </MagBtn>
      </MagActionRow>

      <div className="mag-kpi-grid mag-kpi-grid--4" style={{ marginBottom: 20 }}>
        <MagKpi
          label="Besoins totaux"
          value={needs.length}
          unit="références"
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          sub={`${categories.length} catégories`}
          subTone="flat"
        />
        {totalByUnit.slice(0, 3).map(([unit, qty]) => (
          <MagKpi
            key={unit}
            label={`Total ${unit.toUpperCase()}`}
            value={formatMagQty(qty)}
            unit={unit}
            icon={<ShoppingCart className="w-3.5 h-3.5" />}
            subTone="flat"
          />
        ))}
      </div>

      <div className="mag-chips" style={{ marginBottom: 16 }}>
        <MagChip active={cat === "ALL"} onClick={() => setCat("ALL")}>
          Tous <span className="mag-chip-n">{needs.length}</span>
        </MagChip>
        {categories.map((k) => (
          <MagChip key={k} active={cat === k} onClick={() => setCat(k)}>
            {CATEGORY_LABEL[k] ?? k}
            <span className="mag-chip-n">{needs.filter((n) => n.category === k).length}</span>
          </MagChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <MagCardFlat>
          <MagEmpty icon={<ClipboardList className="w-8 h-8 opacity-30" />} title="Aucun besoin" />
        </MagCardFlat>
      ) : (
        <MagCardFlat>
          <MagCardHead
            title={`Besoins d'approvisionnement — Campagne ${needs[0]?.campaign_year ?? 2026}`}
            icon={<ClipboardList className="w-3.5 h-3.5" />}
            right={
              <span className="mag-muted" style={{ fontSize: 11.5 }}>
                {filtered.length} référence{filtered.length !== 1 ? "s" : ""}
              </span>
            }
          />
          <div className="mag-table-wrap">
            <table className="mag-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Produit / M.A.</th>
                  <th className="mag-td-num">Quantité</th>
                  <th>Unité</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <MagBadge tone={CATEGORY_TONE[n.category] ?? "gray"} dot={false}>
                        {CATEGORY_LABEL[n.category] ?? n.category}
                      </MagBadge>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{n.product_label || "—"}</div>
                      {n.active_ingredient_text && (
                        <div className="mag-muted" style={{ fontSize: 11 }}>{n.active_ingredient_text}</div>
                      )}
                    </td>
                    <td className="mag-td-num" style={{ fontWeight: 800 }}>
                      {formatMagQty(n.quantity_needed)}
                    </td>
                    <td className="mag-mono" style={{ fontSize: 12 }}>{n.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MagCardFlat>
      )}
    </MagPage>
  );
}
