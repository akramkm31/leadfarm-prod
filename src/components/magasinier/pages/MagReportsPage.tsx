"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Printer, Search } from "lucide-react";
import { useTreatments } from "@/hooks/useData";
import type { Treatment } from "@/lib/mock-data";
import { downloadCSV } from "@/lib/export-csv";

type TreatmentRow = Treatment & { culture?: string; materiel?: string };
import { genererOrdreTraitementPDF } from "@/lib/pdf/ordreTraitement";
import {
  MagPage,
  MagActionRow,
  MagBtn,
  MagChip,
  MagBadge,
  MagNotice,
  MagEmpty,
} from "@/components/magasinier/ui";
import { MAG_TREAT_STATUS, formatMagDate } from "@/lib/magasinier/helpers";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function MagReportsPage() {
  const { data, loading } = useTreatments();
  const treatments = (data ?? []) as TreatmentRow[];
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { planned: 0, in_progress: 0, completed: 0 };
    treatments.forEach((t) => {
      if (c[t.status] != null) c[t.status]++;
    });
    return c;
  }, [treatments]);

  const list = useMemo(
    () =>
      treatments.filter((t) => {
        if (status !== "all" && t.status !== status) return false;
        const q = search.toLowerCase();
        if (!q) return true;
        return (
          (t.parcelleName ?? "").toLowerCase().includes(q) ||
          String(t.id).toLowerCase().includes(q)
        );
      }),
    [treatments, search, status]
  );

  const downloadPdf = async (t: TreatmentRow) => {
    setDownloading(t.id);
    try {
      const blob = await genererOrdreTraitementPDF({
        site: "Groupe Lechehab — Les Frères Lacheb",
        n_traitement: t.id,
        date_prevue: t.plannedDate,
        parcelle_nom: t.parcelleName,
        superficie_ha: t.areaTreatedHectares,
        culture: t.culture || "",
        operateur_nom: t.operatorName,
        produits: (t.products ?? []).map((p) => ({
          nom_commercial: p.productName,
          matiere_active: "",
          dose_hl: p.dosePerHectare ? `${p.dosePerHectare} L/ha` : "",
          quantite_sortir: p.quantityUsed != null ? `${p.quantityUsed} ${p.unit ?? ""}` : "",
        })),
        signe: true,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ordre_${t.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <MagPage>
      <MagActionRow>
        <MagBtn onClick={() => downloadCSV(
          treatments.map((t) => ({
            id: String(t.id).slice(0, 8).toUpperCase(),
            parcelle: t.parcelleName ?? "",
            date_prevue: t.plannedDate ?? "",
            statut: t.status ?? "",
            produits: (t.products ?? []).map((p) => p.productName).join(", "),
            operateur: t.operatorName ?? "",
            superficie_ha: t.areaTreatedHectares ?? "",
          })),
          [
            { key: "id", label: "N° Ordre" },
            { key: "parcelle", label: "Parcelle" },
            { key: "date_prevue", label: "Date prévue" },
            { key: "statut", label: "Statut" },
            { key: "produits", label: "Produits" },
            { key: "operateur", label: "Opérateur" },
            { key: "superficie_ha", label: "Superficie (ha)" },
          ],
          `ordres_traitement_${new Date().toISOString().slice(0, 10)}.csv`
        )}>
          <Download className="w-4 h-4" />
          Export batch
        </MagBtn>
        <MagBtn onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Imprimer
        </MagBtn>
      </MagActionRow>

      <div className="mag-row-between wrap" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div className="mag-chips">
          {[
            ["all", "Tous", treatments.length],
            ["planned", "Planifiés", counts.planned],
            ["in_progress", "En cours", counts.in_progress],
            ["completed", "Terminés", counts.completed],
          ].map(([k, l, n]) => (
            <MagChip key={k} active={status === k} onClick={() => setStatus(k as string)}>
              {l} <span className="mag-chip-n">{n}</span>
            </MagChip>
          ))}
        </div>
        <div className="mag-search-inline">
          <Search className="w-3.5 h-3.5 mag-muted" />
          <input
            type="text"
            placeholder="Rechercher parcelle, n° ordre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mag-card--flat">
        <div className="mag-table-wrap">
          <table className="mag-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Parcelle</th>
                <th>Date prévue</th>
                <th>Produits</th>
                <th>Statut</th>
                <th className="mag-td-num">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <MagEmpty
                      icon={<FileText className="w-8 h-8 opacity-30" />}
                      title="Aucun document"
                      sub="Aucun ordre ne correspond à ce filtre."
                    />
                  </td>
                </tr>
              ) : (
                list.map((t) => {
                  const st = MAG_TREAT_STATUS[t.status] ?? { label: t.status, tone: "gray" as const };
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>Ordre {String(t.id).slice(0, 8).toUpperCase()}</div>
                        <div className="mag-muted" style={{ fontSize: 10.5 }}>
                          Sortie magasin · {t.culture || t.type}
                        </div>
                      </td>
                      <td>{t.parcelleName}</td>
                      <td className="mag-mono">{formatMagDate(t.plannedDate)}</td>
                      <td className="mag-muted">
                        {(t.products ?? []).length
                          ? `${t.products!.length} produit${t.products!.length > 1 ? "s" : ""}`
                          : "non renseigné"}
                      </td>
                      <td>
                        <MagBadge tone={st.tone}>{st.label}</MagBadge>
                      </td>
                      <td className="mag-td-num">
                        <MagBtn sm primary disabled={downloading === t.id} onClick={() => downloadPdf(t)}>
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </MagBtn>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MagNotice tone="blue" icon={<FileText className="w-4 h-4" />}>
        Génération orientée <strong>documents de sortie magasin</strong> (ordres de traitement à imprimer pour les
        opérateurs). Le registre phytosanitaire réglementaire complet relève du module conformité du directeur.
      </MagNotice>
    </MagPage>
  );
}
