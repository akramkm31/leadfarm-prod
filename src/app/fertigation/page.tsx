"use client";

import { useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { useParcelles } from "@/hooks/useData";
import { cn } from "@/lib/utils";
import { genererOrdreFertigationPDF } from "@/lib/pdf/ordreFertigation";
import type { Parcelle } from "@/lib/mock-data";
import {
  Droplets,
  Plus,
  Search,
  Loader2,
  Download,
  CheckCircle2,
  X,
  FileText,
  Sprout,
  Beaker,
  Gauge,
  Ruler,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProduitFertigation {
  nom_commercial: string;
  composition: string;
  dose_hl: string;
  volume: number;
  quantite_par_bac: string;
  nombre_bacs: number;
  quantite_sortir: string; // calcul� auto
}

interface FertigationRecord {
  id: string;
  n_fertigation: string;
  parcelle_nom: string;
  culture: string;
  date_fertigation: string;
  mode_application: string;
  produits: ProduitFertigation[];
  visa_responsable?: string;
  created_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FertigationPage() {
  const { data: parcellesRaw } = useParcelles();
  const parcelles = (parcellesRaw || []) as Parcelle[];

  const [history, setHistory] = useState<FertigationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  // Formulaire
  const [selectedParcelleId, setSelectedParcelleId] = useState("");
  const [nFertigation, setNFertigation] = useState("");
  const [modeApp, setModeApp] = useState("Irrigation goutte-�-goutte");
  const [materiel, setMateriel] = useState("Pompe doseuse + injecteur Venturi");
  const [pression, setPression] = useState(3);
  const [produits, setProduits] = useState<ProduitFertigation[]>([]);
  const [visa, setVisa] = useState("");

  // Charger l'historique
  useState(() => {
    async function load() {
      setLoadingHistory(true);
      try {
        const { data } = await supabase
          .from("fertigations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) {
          setHistory(data.map((r: any) => ({
            id: r.id,
            n_fertigation: r.n_fertigation,
            parcelle_nom: r.parcelles?.nom || "",
            culture: r.parcelles?.culture_actuelle || "",
            date_fertigation: r.date_fertigation,
            mode_application: r.mode_application || "",
            produits: r.produits || [],
            visa_responsable: r.visa_responsable,
            created_at: r.created_at,
          })));
        }
      } catch { /* silencieux */ }
      setLoadingHistory(false);
    }
    load();
  });

  const selectedParcelle = parcelles.find((p) => p.id === selectedParcelleId);

  // G�n�rer le num�ro de fertigation
  function genererNumero() {
    const year = new Date().getFullYear();
    const seq = String(history.length + 1).padStart(3, "0");
    return `F-${year}-${seq}`;
  }

  // Ajouter un produit
  function ajouterProduit() {
    setProduits((prev) => [
      ...prev,
      {
        nom_commercial: "",
        composition: "",
        dose_hl: "",
        volume: 0,
        quantite_par_bac: "",
        nombre_bacs: 1,
        quantite_sortir: "",
      },
    ]);
  }

  // Mettre � jour un produit
  function updateProduit(index: number, field: keyof ProduitFertigation, value: any) {
    setProduits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Calcul automatique de quantite_sortir
      if (field === "volume" || field === "nombre_bacs" || field === "quantite_par_bac") {
        const vol = parseFloat(String(updated[index].volume)) || 0;
        const nb = parseInt(String(updated[index].nombre_bacs)) || 0;
        const qteParBac = parseFloat(String(updated[index].quantite_par_bac)) || 0;
        const total = vol > 0 && nb > 0 ? vol * nb : qteParBac * nb;
        updated[index].quantite_sortir = total > 0 ? `${total.toFixed(1)} L` : "";
      }
      return updated;
    });
  }

  // Supprimer un produit
  function supprimerProduit(index: number) {
    setProduits((prev) => prev.filter((_, i) => i !== index));
  }

  // G�n�rer le PDF et sauvegarder
  async function genererPDF() {
    if (!selectedParcelle) return;
    setGenerating(true);
    try {
      const num = nFertigation || genererNumero();
      const pdfBlob = await genererOrdreFertigationPDF({
        site: "Domaine Khelifa",
        n_fertigation: num,
        date: new Date().toISOString(),
        parcelle_nom: selectedParcelle.name,
        superficie_ha: selectedParcelle.areaHectares,
        culture: selectedParcelle.cropType || "",
        variete: "",
        mode_application: modeApp,
        materiel,
        pression_bar: pression,
        produits,
        visa_responsable: visa || undefined,
        signe: !!visa,
      });

      // Upload PDF
      const filename = `FOR.PR5.003_${num}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, pdfBlob, { upsert: true });

      if (uploadError) console.error("Upload error:", uploadError);

      // Sauvegarder en base
      await supabase.from("fertigations").insert({
        n_fertigation: num,
        parcelle_id: selectedParcelleId,
        date_fertigation: new Date().toISOString().split("T")[0],
        mode_application: modeApp,
        materiel,
        pression_bar: pression,
        produits,
        visa_responsable: visa || null,
        pdf_url: uploadError ? null : filename,
      });

      // T�l�charger le PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FOR.PR5.003_${num}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Erreur g�n�ration PDF:", err);
    } finally {
      setGenerating(false);
    }
  }

  function resetForm() {
    setSelectedParcelleId("");
    setNFertigation("");
    setModeApp("Irrigation goutte-�-goutte");
    setMateriel("Pompe doseuse + injecteur Venturi");
    setPression(3);
    setProduits([]);
    setVisa("");
  }

  const filteredHistory = history.filter(
    (h) =>
      h.parcelle_nom.toLowerCase().includes(search.toLowerCase()) ||
      h.n_fertigation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="glass-card p-5 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--color-valley-green)]/[0.06] blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 border border-[var(--color-valley-green)]/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                <Sprout className="w-7 h-7 text-[var(--color-valley-green)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight">Fertigation</h1>
                <p className="text-xs text-[var(--color-adaline-ink)]/55 mt-0.5 flex items-center gap-2">
                  <Beaker className="w-3 h-3 text-[var(--color-adaline-ink)]/40" />
                  Ordres de fertigation &mdash; FOR.PR5.003
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/80 to-emerald-500/60 hover:from-emerald-500/90 hover:to-emerald-400/70 text-[var(--color-adaline-ink)] text-sm font-semibold flex items-center gap-2 border border-emerald-400/25 shadow-lg shadow-emerald-500/10 transition-all hover:shadow-emerald-400/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Nouvel Ordre
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <FileText className="w-4 h-4 text-[var(--color-valley-green)]" />
              <div>
                <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono">{history.length}</p>
                <p className="text-[10px] text-[var(--color-adaline-ink)]/50 uppercase tracking-wider">Ordres</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <Droplets className="w-4 h-4 text-[var(--color-valley-green)]" />
              <div>
                <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono">{parcelles.length}</p>
                <p className="text-[10px] text-[var(--color-adaline-ink)]/50 uppercase tracking-wider">Parcelles</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <Gauge className="w-4 h-4 text-[var(--color-valley-green)]" />
              <div>
                <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono">{produits.length || "---"}</p>
                <p className="text-[10px] text-[var(--color-adaline-ink)]/50 uppercase tracking-wider">Produits/ordre</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/35" />
          <input
            type="text"
            placeholder="Rechercher un ordre de fertigation..."
            className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="glass-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-adaline-ink)]/85">Nouvel Ordre de Fertigation</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[var(--color-adaline-ink)]/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1.5">N� Fertigation</label>
                <input
                  type="text"
                  className="glass-input px-3 py-2 text-sm w-full"
                  placeholder={genererNumero()}
                  value={nFertigation}
                  onChange={(e) => setNFertigation(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1.5">Parcelle</label>
                <select
                  className="glass-input px-3 py-2 text-sm w-full"
                  value={selectedParcelleId}
                  onChange={(e) => setSelectedParcelleId(e.target.value)}
                >
                  <option value="">S�lectionner...</option>
                  {parcelles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.cropType || "N/A"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1.5">Mode d'application</label>
                <select
                  className="glass-input px-3 py-2 text-sm w-full"
                  value={modeApp}
                  onChange={(e) => setModeApp(e.target.value)}
                >
                  <option>Irrigation goutte-�-goutte</option>
                  <option>Irrigation localis�e</option>
                  <option>Pulv�risation foliaire</option>
                  <option>Fertirrigation</option>
                  <option>Hydroponie</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1.5">Mat�riel</label>
                <input
                  type="text"
                  className="glass-input px-3 py-2 text-sm w-full"
                  value={materiel}
                  onChange={(e) => setMateriel(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1.5">Pression (bar)</label>
                <input
                  type="number"
                  step="0.1"
                  className="glass-input px-3 py-2 text-sm w-full"
                  value={pression}
                  onChange={(e) => setPression(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Produits */}
            <div className="pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[var(--color-adaline-ink)]/50 uppercase tracking-wider">Produits (Engrais)</p>
                <button
                  onClick={ajouterProduit}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/25"
                >
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              </div>

              {produits.length === 0 && (
                <p className="text-sm text-[var(--color-adaline-ink)]/40 italic py-4 text-center">
                  Aucun produit ajout�. Cliquez "Ajouter" pour ajouter un engrais/fertigant.
                </p>
              )}

              <div className="space-y-2">
                {produits.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <span className="text-xs text-[var(--color-adaline-ink)]/40 font-mono w-5">{i + 1}</span>
                    <input
                      type="text"
                      placeholder="Nom commercial"
                      className="glass-input px-2 py-1.5 text-xs w-36"
                      value={p.nom_commercial}
                      onChange={(e) => updateProduit(i, "nom_commercial", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Composition (NPK...)"
                      className="glass-input px-2 py-1.5 text-xs w-28"
                      value={p.composition}
                      onChange={(e) => updateProduit(i, "composition", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Dose (/hl)"
                      className="glass-input px-2 py-1.5 text-xs w-20"
                      value={p.dose_hl}
                      onChange={(e) => updateProduit(i, "dose_hl", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Volume"
                      className="glass-input px-2 py-1.5 text-xs w-16"
                      value={p.volume || ""}
                      onChange={(e) => updateProduit(i, "volume", parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="text"
                      placeholder="Qt�/bac"
                      className="glass-input px-2 py-1.5 text-xs w-20"
                      value={p.quantite_par_bac}
                      onChange={(e) => updateProduit(i, "quantite_par_bac", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Nb bacs"
                      className="glass-input px-2 py-1.5 text-xs w-16"
                      value={p.nombre_bacs || ""}
                      onChange={(e) => updateProduit(i, "nombre_bacs", parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-mono text-[var(--color-valley-green)] w-20 text-right">
                      {p.quantite_sortir}
                    </span>
                    <button
                      onClick={() => supprimerProduit(i)}
                      className="p-1 rounded hover:bg-white/[0.06] text-[var(--color-adaline-ink)]/30 hover:text-[var(--color-valley-green)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Visa */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
              <label className="text-xs text-[var(--color-adaline-ink)]/50">Visa Responsable du Site :</label>
              <input
                type="text"
                className="glass-input px-3 py-1.5 text-sm w-48"
                placeholder="Nom + signature"
                value={visa}
                onChange={(e) => setVisa(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.04]"
              >
                Annuler
              </button>
              <button
                onClick={genererPDF}
                disabled={generating || !selectedParcelle}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                G�n�rer et T�l�charger
              </button>
            </div>
          </div>
        )}

        {/* Historique */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85 mb-4">Historique des Ordres</h3>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[var(--color-valley-green)] animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-[var(--color-adaline-ink)]/40 italic text-center py-8">Aucun ordre de fertigation trouv�.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>N� Fertigation</th>
                    <th>Parcelle</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Produits</th>
                    <th>Visa</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((h) => (
                    <tr key={h.id}>
                      <td><span className="font-mono text-xs text-[var(--color-adaline-ink)]/60">{h.n_fertigation}</span></td>
                      <td><span className="text-sm text-[var(--color-adaline-ink)]/70">{h.parcelle_nom}</span></td>
                      <td><span className="text-xs text-[var(--color-adaline-ink)]/50">{new Date(h.date_fertigation).toLocaleDateString("fr-FR")}</span></td>
                      <td><span className="text-xs text-[var(--color-adaline-ink)]/50">{h.mode_application}</span></td>
                      <td><span className="text-xs text-[var(--color-adaline-ink)]/50">{h.produits.length} produit(s)</span></td>
                      <td>
                        {h.visa_responsable ? (
                          <span className="flex items-center gap-1 text-xs text-[var(--color-valley-green)]">
                            <CheckCircle2 className="w-3 h-3" /> Sign�
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-adaline-ink)]/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
