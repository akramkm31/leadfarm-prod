"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { MagasinierPage } from "@/components/magasinier/MagasinierBranch";
import MagProductsPage from "@/components/magasinier/pages/MagProductsPage";
import { useProducts, useStockLevels } from "@/hooks/useData";
import {
  categoryLabels,
  categoryColors,
  formulationLabels,
  type ProductCategory,
  type PhytoProduct,
  type StockLevel,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { updateProduct, insertProduct } from "@/lib/data-provider";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import EditableCell from "@/components/ui/EditableCell";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  FlaskConical,
  Plus,
  ChevronRight,
  Package,
  Truck,
  Search,
  X,
  Shield,
  Target,
  Calendar,
  Beaker,
  Layers,
  AlertTriangle,
  Clock,
  Info,
  Atom,
} from "lucide-react";

export default function ProductsPage() {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <MagasinierPage mag={MagProductsPage} />;
  }
  return <ProductsContent />;
}

function ProductsContent() {
  const { data: productsRaw, loading: productsLoading, refetch } = useProducts();
  const { data: stockLevelsRaw, loading: stockLoading } = useStockLevels();
  const products = useMemo(() => (productsRaw || []) as PhytoProduct[], [productsRaw]);
  const stockLevels = useMemo(() => (stockLevelsRaw || []) as StockLevel[], [stockLevelsRaw]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<PhytoProduct | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const [showAddModal, setShowAddModal] = useState(false);
  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const productColMap: Record<string, { dbCol: string; type: "text" | "number" | "date" }> = {
    tradeName: { dbCol: "trade_name", type: "text" },
    activeSubstance: { dbCol: "active_substance", type: "text" },
    formulation: { dbCol: "formulation", type: "text" },
    familleChimique: { dbCol: "famille_chimique", type: "text" },
  };

  const handleProductSave = useCallback(async (id: string, dbUpdates: Record<string, unknown>): Promise<void> => {
    await updateProduct(id, dbUpdates);
  }, []);

  const productEdit = useInlineEdit(products, () => {}, handleProductSave, productColMap);

  if (productsLoading || stockLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  const filtered = products.filter((p: PhytoProduct): boolean => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (p.name || p.tradeName || "").toLowerCase().includes(q) ||
      (p.tradeName || "").toLowerCase().includes(q) ||
      (p.activeSubstance || "").toLowerCase().includes(q) ||
      (p.familleChimique || "").toLowerCase().includes(q) ||
      (p.supplierName || "").toLowerCase().includes(q) ||
      (p.cible || []).some((c: string): boolean => c.toLowerCase().includes(q));
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const categories: { value: ProductCategory | "all"; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "fongicide", label: "Fongicide" },
    { value: "herbicide", label: "Herbicide" },
    { value: "insecticide", label: "Insecticide" },
    { value: "engrais", label: "Engrais" },
    { value: "acaricide", label: "Acaricide" },
    { value: "adjuvant", label: "Adjuvant" },
    { value: "semence", label: "Semence" },
  ];

  const expiringSoon = products.filter((p: PhytoProduct): boolean => {
    const expiry = new Date(p.expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  });

  const lowStock = stockLevels.filter((s: StockLevel): boolean => s.status === "low" || s.status === "critical");
  const uniqueCategories = new Set(products.map((p: PhytoProduct): ProductCategory => p.category));

  return (
    <AppLayout>
      {/* ── Hero Header ── */}
      <div className="lf-page-header mb-5 relative overflow-hidden">
        {/* Decorative background accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--color-valley-green)]/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[var(--color-valley-green)]/[0.05] blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4">
          {/* Left: Title block */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 border border-[var(--color-valley-green)]/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <FlaskConical className="w-7 h-7 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight">Produits Phytosanitaires</h1>
              <p className="text-xs text-[var(--color-adaline-ink)]/55 mt-0.5 flex items-center gap-2">
                <Shield className="w-3 h-3 text-[var(--color-adaline-ink)]/40" />
                Registre de traçabilité &mdash; Catalogue & conformité phytosanitaire
              </p>
            </div>
          </div>

          {/* Right: Action button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/80 to-emerald-500/60 hover:from-emerald-500/90 hover:to-emerald-400/70 text-[var(--color-adaline-ink)] text-sm font-semibold flex items-center gap-2 border border-emerald-400/25 shadow-lg shadow-emerald-500/10 transition-all duration-200 hover:shadow-emerald-400/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Ajouter un produit
          </button>
        </div>

        {/* KPI row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {/* Total products */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{products.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Produits</p>
            </div>
          </div>

          {/* Filtered count */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{uniqueCategories.size}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Catégories</p>
            </div>
          </div>

          {/* Expiring soon */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            expiringSoon.length > 0
              ? "bg-[var(--color-valley-green)]/[0.06] border-emerald-500/15 hover:bg-[var(--color-valley-green)]/[0.1]"
              : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              expiringSoon.length > 0
                ? "bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20"
                : "bg-white/[0.06] border border-white/[0.08]"
            )}>
              <Clock className={cn("w-4 h-4", expiringSoon.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/40")} />
            </div>
            <div>
              <p className={cn(
                "text-lg font-bold font-mono tabular-nums leading-none",
                expiringSoon.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/55"
              )}>{expiringSoon.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Expirent bientôt</p>
            </div>
          </div>

          {/* Low stock */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            lowStock.length > 0
              ? "bg-[var(--color-valley-green)]/[0.06] border-emerald-500/15 hover:bg-[var(--color-valley-green)]/[0.1]"
              : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              lowStock.length > 0
                ? "bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20"
                : "bg-white/[0.06] border border-white/[0.08]"
            )}>
              <AlertTriangle className={cn("w-4 h-4", lowStock.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/40")} />
            </div>
            <div>
              <p className={cn(
                "text-lg font-bold font-mono tabular-nums leading-none",
                lowStock.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/55"
              )}>{lowStock.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Stock faible</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/40" />
          <input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Rechercher produit, substance, famille..."
            className="glass-input pl-9 pr-4 py-2 text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-0.5 p-1 bg-black/40 rounded-xl border border-[var(--color-stone-moss)] flex-wrap">
          {categories.map((cat: { value: ProductCategory | "all"; label: string }): React.ReactNode => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                categoryFilter === cat.value
                  ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/30"
                  : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70 border border-transparent"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Professional Table */}
      <div className="glass-card overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Produit</th>
              <th style={{ width: "12%" }}>Catégorie</th>
              <th style={{ width: "22%" }}>Matière Active</th>
              <th style={{ width: "10%" }}>Formulation</th>
              <th style={{ width: "13%" }}>Famille Chimique</th>
              <th style={{ width: "10%" }} className="text-right">Stock</th>
              <th style={{ width: "5%" }}>Unité</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((product: PhytoProduct): React.ReactNode => {
              const stock = stockLevels.find((s: StockLevel): boolean => s.productId === product.id);
              const isSelected = selectedProduct?.id === product.id;
              const qty = stock?.currentQuantity ?? 0;
              const isNeg = qty < 0;

              return (
                <tr
                  key={product.id}
                  onClick={() => setSelectedProduct(isSelected ? null : product)}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "!bg-[var(--color-valley-green)]/[0.08]",
                    isNeg && "!bg-[var(--color-valley-green)]/[0.04]"
                  )}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: categoryColors[product.category] }}
                      />
                      <EditableCell rowId={product.id} col="tradeName" value={product.tradeName}
                        className="text-sm font-semibold text-[var(--color-adaline-ink)]/90" colMap={productColMap}
                        isEditing={productEdit.isEditing(product.id, "tradeName")}
                        isSaving={productEdit.isSaving(product.id, "tradeName")}
                        editValue={productEdit.editValue} setEditValue={productEdit.setEditValue}
                        editInputRef={productEdit.editInputRef} startEdit={productEdit.startEdit}
                        saveEdit={productEdit.saveEdit} cancelEdit={productEdit.cancelEdit} />
                    </div>
                  </td>
                  <td>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md border"
                      style={{
                        color: categoryColors[product.category],
                        backgroundColor: categoryColors[product.category] + "10",
                        borderColor: categoryColors[product.category] + "20",
                      }}
                    >
                      {categoryLabels[product.category]}
                    </span>
                  </td>
                  <td>
                    <EditableCell rowId={product.id} col="activeSubstance"
                      value={product.activeSubstance && product.activeSubstance !== "/" ? product.activeSubstance : null}
                      className="text-xs text-[var(--color-adaline-ink)]/50" colMap={productColMap}
                      isEditing={productEdit.isEditing(product.id, "activeSubstance")}
                      isSaving={productEdit.isSaving(product.id, "activeSubstance")}
                      editValue={productEdit.editValue} setEditValue={productEdit.setEditValue}
                      editInputRef={productEdit.editInputRef} startEdit={productEdit.startEdit}
                      saveEdit={productEdit.saveEdit} cancelEdit={productEdit.cancelEdit} />
                  </td>
                  <td>
                    <EditableCell rowId={product.id} col="formulation"
                      value={product.formulation && String(product.formulation) !== "/" ? product.formulation : null}
                      className="text-xs text-[var(--color-adaline-ink)]/55" colMap={productColMap}
                      isEditing={productEdit.isEditing(product.id, "formulation")}
                      isSaving={productEdit.isSaving(product.id, "formulation")}
                      editValue={productEdit.editValue} setEditValue={productEdit.setEditValue}
                      editInputRef={productEdit.editInputRef} startEdit={productEdit.startEdit}
                      saveEdit={productEdit.saveEdit} cancelEdit={productEdit.cancelEdit} />
                  </td>
                  <td>
                    <EditableCell rowId={product.id} col="familleChimique"
                      value={product.familleChimique && product.familleChimique !== "/" ? product.familleChimique : null}
                      className="text-xs text-[var(--color-adaline-ink)]/55" colMap={productColMap}
                      isEditing={productEdit.isEditing(product.id, "familleChimique")}
                      isSaving={productEdit.isSaving(product.id, "familleChimique")}
                      editValue={productEdit.editValue} setEditValue={productEdit.setEditValue}
                      editInputRef={productEdit.editInputRef} startEdit={productEdit.startEdit}
                      saveEdit={productEdit.saveEdit} cancelEdit={productEdit.cancelEdit} />
                  </td>
                  <td className="text-right">
                    <span className={cn(
                      "text-sm font-mono font-bold tabular-nums",
                      isNeg ? "text-[var(--color-valley-green)]" :
                      stock?.status === "low" ? "text-[var(--color-valley-green)]" :
                      stock?.status === "critical" ? "text-[var(--color-valley-green)]" : "text-green-400"
                    )}>
                      {stock ? (Math.abs(qty) >= 10000 ? `${(qty / 1000).toFixed(1)}K` : qty.toFixed(qty % 1 ? 1 : 0)) : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="text-[10px] text-[var(--color-adaline-ink)]/40 font-mono">{stock?.unit || product.unit || "L"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-amber-500/10 border border-[var(--color-stone-moss)] flex items-center justify-center mb-5 empty-state-icon">
              <FlaskConical className="w-10 h-10 text-[var(--color-adaline-ink)]/35" />
            </div>
            <h3 className="text-base font-semibold text-[var(--color-adaline-ink)]/60 mb-2">Aucun produit trouvé</h3>
            <p className="text-sm text-[var(--color-adaline-ink)]/50 max-w-xs">Essayez avec un autre terme de recherche ou modifiez vos filtres.</p>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-[var(--color-adaline-ink)]/55 font-mono">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={(): void => setPage((p: number): number => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.1] text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/80 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_: unknown, i: number): React.ReactNode => {
                const p = totalPages <= 7 ? i + 1 : safePage <= 4 ? i + 1 : safePage >= totalPages - 3 ? totalPages - 6 + i : safePage - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={(): void => setPage(p)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-medium transition-all",
                      p === safePage
                        ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/25"
                        : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70 hover:bg-white/[0.04]"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={(): void => setPage((p: number): number => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.1] text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/80 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-8" />

      {showAddModal && (
        <AddProductModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); refetch(); }} />
      )}
    </AppLayout>
  );
}

function AddProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [form, setForm] = useState({ trade_name: "", category: "engrais", active_substance: "", formulation: "", unit: "L" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string): void => setForm((f: typeof form): typeof form => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.trade_name.trim()) return;
    setSaving(true);
    try {
      await insertProduct(form);
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 " onClick={onClose} />
      <div className="glass-card p-6 w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Nouveau Produit</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Nom commercial *</label>
            <input value={form.trade_name} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("trade_name", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: ABSOLUTE" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Catégorie</label>
              <select value={form.category} onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => set("category", e.target.value)} className="glass-input w-full px-3 py-2 text-sm bg-transparent">
                {["engrais","fongicide","herbicide","insecticide","acaricide","adjuvant","semence","acide_phosphorique","acide_nitrique","acide_sulfurique","acide_humique","matiere_organique","fer","autre"].map((c: string): React.ReactNode => (
                  <option key={c} value={c} className="bg-[#1a2e1a]">{c.replace(/_/g, " ").toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Unité</label>
              <select value={form.unit} onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => set("unit", e.target.value)} className="glass-input w-full px-3 py-2 text-sm bg-transparent">
                {["L","Kg","mL","g"].map((u: string): React.ReactNode => <option key={u} value={u} className="bg-[#1a2e1a]">{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Matière active</label>
            <input value={form.active_substance} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("active_substance", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: Emmactin Benzoate" />
          </div>
          <div>
            <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Formulation</label>
            <input value={form.formulation} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("formulation", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: EC, WG, SC..." />
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving || !form.trade_name.trim()} className="glass-button w-full py-2.5 text-sm mt-5 disabled:opacity-40">
          {saving ? "Enregistrement..." : "Ajouter le produit"}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Info; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 pt-3 border-t border-white/[0.08] first:border-t-0 first:pt-0">
      <Icon className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
      <span className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/55 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: "amber" | "cyan" }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-b-0">
      <span className="text-[11px] text-[var(--color-adaline-ink)]/55">{label}</span>
      <span className={cn(
        "text-[11px] font-medium text-right max-w-[55%]",
        highlight === "amber" ? "text-[var(--color-valley-green)] font-mono" :
        highlight === "cyan" ? "text-[var(--color-valley-green)] font-mono" : "text-[var(--color-adaline-ink)]/60"
      )}>
        {value}
      </span>
    </div>
  );
}