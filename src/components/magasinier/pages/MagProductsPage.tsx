"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Search, X } from "lucide-react";
import { useProducts, useStockLevels } from "@/hooks/useData";
import { insertProduct } from "@/lib/data-provider";
import {
  categoryLabels,
  type ProductCategory,
  type PhytoProduct,
  type StockLevel,
} from "@/lib/mock-data";
import {
  MagPage,
  MagActionRow,
  MagBtn,
  MagChip,
  MagBadge,
} from "@/components/magasinier/ui";
import { formatMagQty, prodIcon, statusBadge, statusTone, MAG_STATUS_LABEL } from "@/lib/magasinier/helpers";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function MagProductsPage() {
  const { data: productsRaw, loading, refetch } = useProducts();
  const { data: stockRaw } = useStockLevels();
  const products = (productsRaw ?? []) as PhytoProduct[];
  const stockLevels = (stockRaw ?? []) as StockLevel[];
  const [cat, setCat] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected] = useState<PhytoProduct | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const stockByProduct = useMemo(() => {
    const m = new Map<string, StockLevel>();
    stockLevels.forEach((s) => m.set(s.productId, s));
    return m;
  }, [stockLevels]);

  const categories = useMemo(() => {
    const set = new Set<ProductCategory>();
    products.forEach((p) => {
      if (p.category) set.add(p.category as ProductCategory);
    });
    return Array.from(set);
  }, [products]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return (
        (p.tradeName ?? "").toLowerCase().includes(q) ||
        (p.activeSubstance ?? "").toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, cat, search]);

  if (loading) return <PageSkeleton />;

  return (
    <MagPage>
      <MagActionRow>
        <MagBtn onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }}>
          <Search className="w-4 h-4" />
          Recherche
        </MagBtn>
        <MagBtn primary onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          Nouveau produit
        </MagBtn>
      </MagActionRow>

      {showSearch && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search className="w-4 h-4" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mag-text-secondary)", pointerEvents: "none" }} />
          <input
            autoFocus
            type="text"
            placeholder="Nom commercial, matière active…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 36px 8px 34px", border: "1px solid var(--mag-border)", borderRadius: 8, fontSize: 14, background: "var(--mag-card)", color: "var(--mag-text)", outline: "none" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--mag-text-secondary)", padding: 0 }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <p className="mag-muted" style={{ fontSize: 12, margin: "-4px 0 14px", fontWeight: 500 }}>
        {list.length} référence{list.length !== 1 ? "s" : ""}{search ? ` · filtre "${search}"` : " · filtre par catégorie"}
      </p>

      <div className="mag-chips" style={{ marginBottom: 16 }}>
        <MagChip active={cat === "all"} onClick={() => setCat("all")}>
          Tous <span className="mag-chip-n">{products.length}</span>
        </MagChip>
        {categories.map((k) => (
          <MagChip key={k} active={cat === k} onClick={() => setCat(k)}>
            {categoryLabels[k]} <span className="mag-chip-n">{products.filter((p) => p.category === k).length}</span>
          </MagChip>
        ))}
      </div>

      <div className="mag-grid-cards">
        {list.map((p) => {
          const s = stockByProduct.get(p.id);
          const name = p.tradeName || p.name || "Sans nom";
          const sTone = s ? statusTone(s.status) : null;
          const sLabel = s ? (MAG_STATUS_LABEL[s.status] ?? s.status) : null;
          return (
            <button
              key={p.id}
              type="button"
              className="mag-card mag-card-pad"
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelected(p)}
            >
              <div className="mag-row-between" style={{ alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
                <div className="mag-row" style={{ gap: 10, flex: 1, minWidth: 0 }}>
                  {prodIcon(p.category, 40)}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{name}</div>
                    <div className="mag-muted" style={{ fontSize: 11, marginTop: 3 }}>
                      {p.activeSubstance || "—"}
                    </div>
                  </div>
                </div>
                <MagBadge tone="green">{categoryLabels[p.category as ProductCategory] || p.category}</MagBadge>
              </div>
              <div className="mag-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {p.familleChimique && <MagBadge tone="gray" dot={false}>{p.familleChimique}</MagBadge>}
                {p.dar != null && p.dar > 0 && <MagBadge tone="gray" dot={false}>DAR {p.dar} j</MagBadge>}
              </div>
              <div className="mag-row-between" style={{ borderTop: "1px solid var(--mag-border-light)", paddingTop: 11 }}>
                <span className="mag-label-sm">En stock</span>
                <div className="mag-row" style={{ gap: 6 }}>
                  {sTone && sLabel && <MagBadge tone={sTone} dot={false}>{sLabel}</MagBadge>}
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    {s ? `${formatMagQty(s.currentQuantity)} ${s.unit}` : "—"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Product detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/45 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div className="mag-card mag-card-pad max-w-md w-full" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="mag-row-between" style={{ marginBottom: 16 }}>
              <div className="mag-row" style={{ gap: 10, flex: 1, minWidth: 0 }}>
                {prodIcon(selected.category, 44)}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.tradeName || selected.name}</div>
                  <div className="mag-muted" style={{ fontSize: 12 }}>{selected.activeSubstance || "—"}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--mag-text-secondary)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const s = stockByProduct.get(selected.id);
              const sTone2 = s ? statusTone(s.status) : null;
              const sLabel2 = s ? (MAG_STATUS_LABEL[s.status] ?? s.status) : null;
              const rows: [string, string][] = [
                ["Catégorie", categoryLabels[selected.category as ProductCategory] || selected.category],
                ["Matière active", selected.activeSubstance || "—"],
                ["Formulation", selected.formulation || "—"],
                ["Famille chimique", (selected as any).familleChimique || "—"],
                ["DAR", selected.dar ? `${selected.dar} jours` : "—"],
                ["Unité de mesure", selected.unit || "—"],
                ...(s ? [
                  ["Stock actuel", `${formatMagQty(s.currentQuantity)} ${s.unit}`],
                  ["Seuil minimum", `${s.minThreshold} ${s.unit}`],
                  ["Seuil maximum", s.maxCapacity ? `${s.maxCapacity} ${s.unit}` : "—"],
                  ["Date péremption", s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("fr-FR") : "—"],
                ] as [string, string][] : []),
              ];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {s && sTone2 && sLabel2 && (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <MagBadge tone={sTone2}>{sLabel2}</MagBadge>
                    </div>
                  )}
                  {rows.map(([label, val]) => val && val !== "—" ? (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--mag-border-light)" }}>
                      <span className="mag-label-sm">{label}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, textAlign: "right", maxWidth: "55%" }}>{val}</span>
                    </div>
                  ) : null)}
                </div>
              );
            })()}

            <div style={{ marginTop: 16 }}>
              <MagBtn onClick={() => setSelected(null)} style={{ width: "100%", justifyContent: "center" }}>Fermer</MagBtn>
            </div>
          </div>
        </div>
      )}

      {/* Add product modal */}
      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </MagPage>
  );
}

function AddProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ trade_name: "", category: "engrais", active_substance: "", formulation: "", unit: "L" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.trade_name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await insertProduct(form);
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'ajout");
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--mag-border)", borderRadius: 8, fontSize: 14, background: "var(--mag-card)", color: "var(--mag-text)", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--mag-text-secondary)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" onClick={onClose}>
      <div className="mag-card mag-card-pad max-w-md w-full" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="mag-row-between" style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Nouveau produit</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mag-text-secondary)", padding: 4 }}><X className="w-5 h-5" /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Nom commercial *</label>
            <input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} style={inputStyle} placeholder="Ex: ABSOLUTE" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} style={{ ...inputStyle }}>
                {["engrais","fongicide","herbicide","insecticide","acaricide","adjuvant","semence","acide_phosphorique","acide_nitrique","acide_sulfurique","acide_humique","matiere_organique","fer","autre"].map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ").toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Unité</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)} style={{ ...inputStyle }}>
                {["L","Kg","mL","g"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Matière active</label>
            <input value={form.active_substance} onChange={(e) => set("active_substance", e.target.value)} style={inputStyle} placeholder="Ex: Emmactin Benzoate" />
          </div>
          <div>
            <label style={labelStyle}>Formulation</label>
            <input value={form.formulation} onChange={(e) => set("formulation", e.target.value)} style={inputStyle} placeholder="Ex: EC, WG, SC..." />
          </div>
        </div>

        {error && <p style={{ color: "var(--mag-red, #ef4444)", fontSize: 12, marginTop: 8 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <MagBtn onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Annuler</MagBtn>
          <MagBtn primary onClick={handleSubmit} disabled={saving || !form.trade_name.trim()} style={{ flex: 1, justifyContent: "center" }}>
            {saving ? "Enregistrement..." : "Ajouter"}
          </MagBtn>
        </div>
      </div>
    </div>
  );
}
