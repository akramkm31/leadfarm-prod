"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  categoryLabels,
  categoryColors,
  type ProductCategory,
  type StockLevel,
  type PhytoProduct,
  type Supplier,
  type Parcelle,
} from "@/lib/mock-data";
import { insertMovement } from "@/lib/data-provider";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Minus,
  RefreshCw,
  X,
  Download,
  ClipboardCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const MOVEMENT_CATEGORIES = [
  "ENGRAIS", "FONGICIDE", "INSECTICIDE", "HERBICIDE", "FER",
  "ACIDE HUMIQUE", "ACIDE NITRIQUE", "ACIDE PHOSPHORIQUE", "ACIDE SULFURIQUE",
  "MATIERE ORGANIQUE", "DRMX", "AUTRE",
] as const;

function uiCategoryToDb(uiCategory: string): string {
  return uiCategory.toLowerCase().replace(/ /g, "_");
}

function productToUiCategory(product: PhytoProduct): string {
  const dbCat = (product.category || "autre").toLowerCase();
  const fromDb = MOVEMENT_CATEGORIES.find((c) => uiCategoryToDb(c) === dbCat);
  if (fromDb) return fromDb;
  const label = (categoryLabels[product.category] || "").toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return MOVEMENT_CATEGORIES.find((c) => c === label) || "AUTRE";
}

function productMatchesUiCategory(product: PhytoProduct, uiCategory: string): boolean {
  const dbCat = (product.category || "autre").toLowerCase();
  const target = uiCategoryToDb(uiCategory);
  if (target === "autre") {
    const known = MOVEMENT_CATEGORIES.filter((c) => c !== "AUTRE").map(uiCategoryToDb);
    return dbCat === "autre" || !known.includes(dbCat);
  }
  return dbCat === target;
}

export function NewEntryModal({ products, suppliers, defaultType = "entree", defaultProductName = "", onClose, onSaved }: { products: PhytoProduct[]; suppliers: Supplier[]; defaultType?: string; defaultProductName?: string; onClose: () => void; onSaved?: () => Promise<void> }) {
  const [movementType, setMovementType] = useState(defaultType);
  const [productSearch, setProductSearch] = useState(defaultProductName);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ENGRAIS");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedDistributor, setSelectedDistributor] = useState("");
  const [selectedCulture, setSelectedCulture] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!defaultProductName) return;
    const match = products.find(
      (p) => p.tradeName?.toLowerCase() === defaultProductName.toLowerCase()
    );
    if (match) {
      setSelectedProductId(match.id);
      setProductSearch(match.tradeName);
      setSelectedCategory(productToUiCategory(match));
    }
  }, [defaultProductName, products]);

  const categoryProducts = useMemo(
    () => products.filter((p) => productMatchesUiCategory(p, selectedCategory)),
    [products, selectedCategory]
  );

  const filteredProducts = useMemo(() => {
    const base = categoryProducts;
    if (!productSearch) return base.slice(0, 30);
    const q = productSearch.toLowerCase();
    return base.filter((p: PhytoProduct) =>
      p.tradeName?.toLowerCase().includes(q) ||
      p.activeSubstance?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [categoryProducts, productSearch]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setOpenDropdown(null);
    if (selectedProductId) {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod && !productMatchesUiCategory(prod, category)) {
        setSelectedProductId("");
        setProductSearch("");
      }
    }
  }, [products, selectedProductId]);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dateValue, setDateValue] = useState(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState("");
  const [bonLivraison, setBonLivraison] = useState(`BL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [lotNumber, setLotNumber] = useState("");
  const [observations, setObservations] = useState("");
  const [detailsSite, setDetailsSite] = useState("");

  const handleSubmit = useCallback(async () => {
    setFormError("");
    if (!selectedProductId) { setFormError("Veuillez sélectionner un produit"); return; }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { setFormError("Veuillez entrer une quantité valide"); return; }

    setSaving(true);
    try {
      // Get product category in DB format (lowercase with underscores)
      const selectedProduct = products.find(p => p.id === selectedProductId);

      const cultureDbMap: Record<string, string> = {
        "A PEPINS": "a_pepins",
        "A NOYAU": "a_noyau",
        "VIGNE": "vigne",
      };

      const noteParts: string[] = [];
      if (observations.trim()) noteParts.push(observations.trim());
      if (movementType === "entree") {
        if (bonLivraison.trim()) noteParts.push(`BL: ${bonLivraison.trim()}`);
        if (lotNumber.trim()) noteParts.push(`Lot: ${lotNumber.trim()}`);
        if (selectedDistributor.trim()) noteParts.push(`Dist: ${selectedDistributor.trim()}`);
      }

      const movementData: Record<string, unknown> = {
        product_id: selectedProductId,
        movement_type: movementType,
        quantity: qty,
        date: dateValue,
        unit: selectedProduct?.unit,
      };

      if (selectedCulture && cultureDbMap[selectedCulture]) {
        movementData.culture = cultureDbMap[selectedCulture];
      }
      if (selectedSite) movementData.site_name = selectedSite;
      if (detailsSite) movementData.details_site = detailsSite;
      if (noteParts.length) movementData.observations = noteParts.join(" | ");

      if (movementType === "entree" && selectedSupplier) {
        const sup = suppliers.find(s => s.name === selectedSupplier);
        if (sup) movementData.supplier_id = sup.id;
      }

      await insertMovement(movementData);
      if (onSaved) await onSaved();
      onClose();
    } catch (err: unknown) {
      // Supabase PostgrestError has .message, .code, .details, .hint as non-enumerable sometimes
      const extracted = err && typeof err === "object"
        ? { message: (err as any).message, code: (err as any).code, details: (err as any).details, hint: (err as any).hint }
        : {};
      console.error("Failed to insert movement:", JSON.stringify(extracted, null, 2), err);
      const msg: string = extracted.message
        || (err instanceof Error ? err.message : null)
        || (err && typeof err === "object" && "issues" in err ? (err as { issues: { message: string }[] }).issues.map((i: { message: string }) => i.message).join(", ") : null)
        || "Erreur lors de l'enregistrement";
      setFormError(msg);
    }
    setSaving(false);
  }, [movementType, selectedProductId, quantity, dateValue, selectedCulture, selectedSite, detailsSite, selectedSupplier, selectedDistributor, observations, bonLivraison, lotNumber, suppliers, products, onClose, onSaved]);

  const typeOptions = [
    { value: "entree", label: "Entrée", desc: "Réception fournisseur", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
    { value: "sortie", label: "Sortie", desc: "Consommation terrain", color: "text-[#203b14]", bg: "bg-[#203b14]/8 border-[#203b14]/25" },
    { value: "retour", label: "Retour", desc: "Retour au magasin", color: "text-amber-700", bg: "bg-amber-50 border-amber-300" },
    { value: "transfert", label: "Transfert", desc: "Inter-sites", color: "text-sky-700", bg: "bg-sky-50 border-sky-300" },
  ];
  const isEntry = movementType === "entree";
  const isExit = movementType === "sortie";

  const categories = MOVEMENT_CATEGORIES;
  const cultures = ["A PEPINS", "A NOYAU", "VIGNE", "TT"];
  const sites = ["TENIRA", "SEFYOUN", "MEZAOUROU", "SIDIHMAD", "KOUANKA", "SYS V", "MAGUER", "TIRMANE"];
  const distributors = ["CASAP", "DEVAGRI", "FILAHIA", "AGRICHEM", "MAHALIYA TAYEB", "HYGINDUST", "ISSERS BOUMERDES", "BLIDA"];

  function DropdownSelect({ label, value, options, open, onToggle, onSelect, placeholder = "Sélectionner..." }: {
    label: string; value: string; options: { value: string; label: string }[]; open: boolean;
    onToggle: () => void; onSelect: (v: string) => void; placeholder?: string;
  }) {
    const dropdownId = `dropdown-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className="relative">
        <label id={`${dropdownId}-label`} className="text-[10px] font-semibold text-[#31200b]/70 uppercase tracking-wide block mb-1">{label}</label>
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${dropdownId}-label`}
          className="glass-input w-full px-3 py-2 text-sm text-left flex items-center justify-between"
        >
          <span className={value ? "text-[var(--color-adaline-ink)]" : "text-[#31200b]/45"}>{value || placeholder}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-[#31200b]/45 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div role="listbox" aria-labelledby={`${dropdownId}-label`} className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-stone-moss)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {options.map((o: { value: string; label: string }) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={value === o.value}
                onClick={() => { onSelect(o.value); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-[#f4f7ef] transition-colors border-b border-[var(--color-stone-moss)]/60 last:border-0",
                  value === o.value ? "bg-[#203b14]/8 text-[#203b14] font-medium" : "text-[var(--color-adaline-ink)]"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} onMouseDown={() => { setShowProductDropdown(false); setOpenDropdown(null); }} />
      <div className="relative glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--surface-pure)] p-6 pb-4 border-b border-[var(--color-stone-moss)] rounded-t-[8px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]">Nouveau Mouvement</h2>
              <p className="text-xs text-[#31200b]/65 mt-0.5">Formulaire de saisie — conforme au registre SBA 2025</p>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-[#f0f2eb] text-[#31200b]/55 hover:text-[var(--color-adaline-ink)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Movement type selector */}
          <div>
            <label className="text-xs font-semibold text-[#31200b]/70 uppercase tracking-wider block mb-2">Type de mouvement</label>
            <div className="grid grid-cols-4 gap-2">
              {typeOptions.map((t: { value: string; label: string; desc: string; color: string; bg: string }) => (
                <button
                  key={t.value}
                  onClick={() => setMovementType(t.value)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    movementType === t.value
                      ? t.bg
                      : "border-[var(--color-stone-moss)] hover:border-[#203b14]/30 hover:bg-[#f8faf5]"
                  )}
                >
                  <span className={cn("text-sm font-semibold block", movementType === t.value ? t.color : "text-[var(--color-adaline-ink)]")}>{t.label}</span>
                  <span className="text-[10px] text-[#31200b]/55 block mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#31200b]/70 block mb-1.5">Date</label>
              <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" value={dateValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateValue(e.target.value)} />
            </div>
            <div className="relative">
              <label className="text-xs font-medium text-[#31200b]/70 block mb-1.5">
                Catégorie
                {selectedProductId && <span className="text-[10px] text-[#203b14]/70 ml-1.5">(auto)</span>}
              </label>
              {selectedProductId ? (
                <div className="glass-input w-full px-3 py-2.5 text-sm flex items-center justify-between opacity-80 cursor-not-allowed bg-[#f4f7ef]">
                  <span className="text-[#203b14] font-medium">{selectedCategory}</span>
                  <span className="text-[10px] text-[#31200b]/50">verrouillé</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
                    className="glass-input w-full px-3 py-2.5 text-sm text-left flex items-center justify-between"
                  >
                    <span className="text-[var(--color-adaline-ink)]">{selectedCategory}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-[#31200b]/45 transition-transform", openDropdown === "cat" && "rotate-180")} />
                  </button>
                  {openDropdown === "cat" && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-stone-moss)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {categories.map((c: string) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleCategoryChange(c)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 text-sm hover:bg-[#f4f7ef] transition-colors border-b border-[var(--color-stone-moss)]/60 last:border-0",
                            selectedCategory === c ? "bg-[#203b14]/8 text-[#203b14] font-medium" : "text-[var(--color-adaline-ink)]"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Product — searchable, filtered by category */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#31200b]/70">Produit (nom commercial)</label>
              <span className="text-[10px] text-[#31200b]/50">{categoryProducts.length} produit{categoryProducts.length !== 1 ? "s" : ""} · {selectedCategory}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#31200b]/40" />
              <input
                type="text"
                className="glass-input w-full pl-9 pr-3 py-2.5 text-sm"
                placeholder={`Rechercher dans ${selectedCategory.toLowerCase()}...`}
                value={productSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
              />
              {selectedProductId && (
                <button
                  onClick={() => { setSelectedProductId(""); setProductSearch(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#f0f2eb]"
                >
                  <X className="w-3 h-3 text-[#31200b]/50" />
                </button>
              )}
            </div>
            {showProductDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-stone-moss)] rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-xs text-[#31200b]/55 text-center">Aucun produit dans cette catégorie</div>
                ) : (
                  filteredProducts.map((p: PhytoProduct) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setProductSearch(p.tradeName);
                        setShowProductDropdown(false);
                        setSelectedCategory(productToUiCategory(p));
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-[#f4f7ef] transition-colors border-b border-[var(--color-stone-moss)]/60 last:border-0",
                        selectedProductId === p.id && "bg-[#203b14]/8"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm text-[var(--color-adaline-ink)] font-medium">{p.tradeName}</span>
                          {p.activeSubstance && (
                            <span className="text-[10px] text-[#31200b]/55 ml-2">{p.activeSubstance}</span>
                          )}
                        </div>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md border shrink-0"
                          style={{
                            backgroundColor: `${categoryColors[p.category] || "#94a3b8"}18`,
                            color: categoryColors[p.category] || "#64748b",
                            borderColor: `${categoryColors[p.category] || "#94a3b8"}40`,
                          }}
                        >
                          {categoryLabels[p.category] || p.category}
                        </span>
                      </div>
                    </button>
                  ))
                )}
                {categoryProducts.length > 30 && !productSearch && (
                  <div className="p-2 text-[10px] text-[#31200b]/50 text-center">Tapez pour filtrer {categoryProducts.length} produits</div>
                )}
              </div>
            )}
          </div>

          {/* Quantity — single field for active type */}
          <div>
            <label className="text-xs font-semibold text-[#31200b]/70 uppercase tracking-wider block mb-2">Quantité (kg/L)</label>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                typeOptions.find(t => t.value === movementType)?.bg
              )}>
                {movementType === "entree" ? <Plus className="w-4 h-4 text-emerald-700" /> :
                 movementType === "sortie" ? <Minus className="w-4 h-4 text-[#203b14]" /> :
                 movementType === "retour" ? <Download className="w-4 h-4 text-amber-700" /> :
                 <RefreshCw className="w-4 h-4 text-sky-700" />}
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  className="glass-input w-full px-3 py-2.5 text-sm"
                  placeholder="Entrez la quantité..."
                  min="0"
                  step="0.1"
                  value={quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                />
              </div>
              <span className={cn(
                "text-xs font-semibold shrink-0",
                typeOptions.find(t => t.value === movementType)?.color
              )}>
                {typeOptions.find(t => t.value === movementType)?.label}
              </span>
            </div>
          </div>

          {/* Destination — Culture + Site */}
          {(isExit || movementType === "transfert") && (
            <div className="p-4 rounded-xl bg-[#f8faf5] border border-[var(--color-stone-moss)]">
              <label className="text-xs font-semibold text-[#31200b]/70 uppercase tracking-wider block mb-3">Destination</label>
              <div className="grid grid-cols-3 gap-3">
                <DropdownSelect
                  label="Culture"
                  value={selectedCulture}
                  options={cultures.map((c: string) => ({ value: c, label: c }))}
                  open={openDropdown === "culture"}
                  onToggle={() => setOpenDropdown(openDropdown === "culture" ? null : "culture")}
                  onSelect={(v) => { setSelectedCulture(v); setOpenDropdown(null); }}
                />
                <DropdownSelect
                  label="Zone / Site"
                  value={selectedSite}
                  options={sites.map((s: string) => ({ value: s, label: s }))}
                  open={openDropdown === "site"}
                  onToggle={() => setOpenDropdown(openDropdown === "site" ? null : "site")}
                  onSelect={(v) => { setSelectedSite(v); setOpenDropdown(null); }}
                />
                <div>
                  <label className="text-[10px] font-semibold text-[#31200b]/70 uppercase tracking-wide block mb-1">Détails site</label>
                  <input type="text" className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: 13ha la base" value={detailsSite} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDetailsSite(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Supplier — only for entries */}
          {isEntry && (
            <div className="p-4 rounded-xl bg-[#f8faf5] border border-[var(--color-stone-moss)]">
              <label className="text-xs font-semibold text-[#31200b]/70 uppercase tracking-wider block mb-3">Traçabilité fournisseur</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <DropdownSelect
                  label="Fournisseur"
                  value={selectedSupplier}
                  options={suppliers.map((s: Supplier) => ({ value: s.name, label: s.name }))}
                  open={openDropdown === "supplier"}
                  onToggle={() => setOpenDropdown(openDropdown === "supplier" ? null : "supplier")}
                  onSelect={(v) => { setSelectedSupplier(v); setOpenDropdown(null); }}
                />
                <DropdownSelect
                  label="Distributeur"
                  value={selectedDistributor}
                  options={distributors.map((d: string) => ({ value: d, label: d }))}
                  open={openDropdown === "distributor"}
                  onToggle={() => setOpenDropdown(openDropdown === "distributor" ? null : "distributor")}
                  onSelect={(v) => { setSelectedDistributor(v); setOpenDropdown(null); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-[#31200b]/70 uppercase tracking-wide block mb-1">N° Bon de livraison</label>
                  <input type="text" className="glass-input w-full px-3 py-2 text-sm" value={bonLivraison} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBonLivraison(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#31200b]/70 uppercase tracking-wide block mb-1">N° Lot</label>
                  <input type="text" className="glass-input w-full px-3 py-2 text-sm" placeholder="LOT-XXX-XXXX" value={lotNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLotNumber(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Observations */}
          <div>
            <label className="text-xs font-medium text-[#31200b]/70 block mb-1.5">Observations</label>
            <textarea className="glass-input w-full px-3 py-2.5 text-sm h-16 resize-none" placeholder="RS, ENTREE, RETOUR, TRANSFERT, STOCK INITIAL..." value={observations} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservations(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--surface-pure)] p-6 pt-4 border-t border-[var(--color-stone-moss)] rounded-b-[8px]">
          <div className="flex items-center justify-between">
            <div>
              {formError && <p className="text-xs text-red-600 mb-1">{formError}</p>}
              <p className="text-[10px] text-[#31200b]/55">Les données seront ajoutées à la table MOUVEMENT</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#31200b]/65 hover:text-[var(--color-adaline-ink)] rounded-xl hover:bg-[#f0f2eb] transition-all">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={saving} className={cn("glass-button px-6 py-2.5 text-sm flex items-center gap-2", saving && "opacity-60 cursor-wait")}>
                <Plus className="w-4 h-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InventoryModal({ stockLevels, onClose, onSaved }: { stockLevels: StockLevel[]; onClose: () => void; onSaved?: () => Promise<void> }) {
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const updateCount = (productId: string, val: string) => setPhysicalCounts({ ...physicalCounts, [productId]: val });
  const filledCount = Object.values(physicalCounts).filter((v: unknown) => v !== "").length;

  const handleValidate = useCallback(async () => {
    setSaving(true);
    setInventoryError("");
    try {
      const updates = Object.entries(physicalCounts).filter(([, v]: [unknown, unknown]) => v !== "");
      for (const [productId, physVal] of updates) {
        const physQty = parseFloat(physVal as string);
        if (isNaN(physQty)) continue;
        const stock = stockLevels.find(s => s.productId === productId);
        const systemQty = stock?.currentQuantity ?? 0;
        const diff = physQty - systemQty;
        if (diff === 0) continue;
        await insertMovement({
          product_id: productId,
          movement_type: diff > 0 ? "entree" : "sortie",
          quantity: Math.abs(diff),
          date: new Date().toISOString().split("T")[0],
          observations: `Inventaire physique: ${systemQty} → ${physQty}${stock?.unit ? " " + stock.unit : ""}`,
        });
      }
      if (onSaved) await onSaved();
      onClose();
    } catch (err: any) {
      console.error("Failed to validate inventory:", err);
      setInventoryError(err?.message || "Erreur lors de la validation de l'inventaire");
    }
    setSaving(false);
  }, [physicalCounts, stockLevels, onClose, onSaved]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 " onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95  rounded-2xl shadow-xl border border-white/[0.15] w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Inventaire Physique</h2>
            <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">Comparer le stock physique avec le stock système</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.06] text-[var(--color-adaline-ink)]/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <table className="glass-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Stock Système</th>
              <th>Stock Physique</th>
              <th>Écart</th>
            </tr>
          </thead>
          <tbody>
            {stockLevels.map((stock: StockLevel) => (
              <tr key={stock.productId}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[stock.category] }} />
                    <span className="text-sm text-[var(--color-adaline-ink)]/70">{stock.productName}</span>
                  </div>
                </td>
                <td>
                  <span className="text-sm font-mono text-[var(--color-adaline-ink)]/60">
                    {stock.currentQuantity.toFixed(stock.currentQuantity % 1 ? 1 : 0)} {stock.unit}
                  </span>
                </td>
                <td>
                  <input
                    type="number"
                    className="glass-input px-3 py-1.5 text-sm w-24 font-mono"
                    placeholder="—"
                    step="0.1"
                    value={physicalCounts[stock.productId] ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCount(stock.productId, e.target.value)}
                  />
                </td>
                <td>
                  {physicalCounts[stock.productId] !== undefined && physicalCounts[stock.productId] !== "" ? (
                    (() => {
                      const ecart = parseFloat(physicalCounts[stock.productId]) - stock.currentQuantity;
                      return <span className={cn("text-sm font-mono font-bold", ecart > 0 ? "text-green-400" : ecart < 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30")}>{ecart > 0 ? "+" : ""}{ecart.toFixed(1)}</span>;
                    })()
                  ) : (
                    <span className="text-sm font-mono text-[var(--color-adaline-ink)]/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inventoryError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{inventoryError}</div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/[0.08]">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.04] transition-all">
            Annuler
          </button>
          <button onClick={() => window.print()} className="px-4 py-2.5 text-sm rounded-xl border border-white/[0.1] text-[var(--color-adaline-ink)]/60 hover:bg-white/[0.04] transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Imprimer
          </button>
          <button onClick={handleValidate} disabled={saving || filledCount === 0} className={cn("glass-button px-6 py-2.5 text-sm flex items-center gap-2", (saving || filledCount === 0) && "opacity-40 cursor-not-allowed")}>
            <ClipboardCheck className="w-4 h-4" />
            {saving ? "Validation..." : `Valider (${filledCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsommationModal({ products, parcelles, stockLevels, onClose, onSaved }: { products: PhytoProduct[]; parcelles: Parcelle[]; stockLevels: StockLevel[]; onClose: () => void; onSaved?: () => Promise<void> }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const [step, setStep] = useState(1);
  const [selectedParcelle, setSelectedParcelle] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [operateur, setOperateur] = useState("");
  const [lines, setLines] = useState([{ productId: "", productName: "", qty: "", unit: "L" }]);
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [parcelleSearch, setParcelleSearch] = useState("");
  const [modalError, setModalError] = useState("");

  const treatmentTypes = [
    { id: "fongicide", label: "Fongicide préventif", icon: "\u{1F6E1}\u{FE0F}", color: "#10b981" },
    { id: "insecticide", label: "Traitement insecticide", icon: "\u{1F41B}", color: "#ef4444" },
    { id: "desherbage", label: "Désherbage", icon: "\u{1F33F}", color: "#f59e0b" },
    { id: "foliaire", label: "Fertilisation foliaire", icon: "\u{1F343}", color: "#06b6d4" },
    { id: "acaricide", label: "Traitement acaricide", icon: "\u{1F577}\u{FE0F}", color: "#8b5cf6" },
    { id: "stimulant", label: "Stimulant racinaire", icon: "\u{1F331}", color: "#84cc16" },
  ];

  const filteredParcelles = parcelleSearch
    ? parcelles.filter(p => p.name.toLowerCase().includes(parcelleSearch.toLowerCase()))
    : parcelles;

  const getStockForProduct = (productId: string) => {
    const stock = stockLevels.find(s => s.productId === productId);
    return stock ? { qty: stock.currentQuantity, unit: stock.unit, status: stock.status } : null;
  };

  const addLine = () => setLines([...lines, { productId: "", productName: "", qty: "", unit: "L" }]);
  const removeLine = (i: number) => setLines(lines.filter((_: unknown, idx: number) => idx !== i));
  const updateLine = (i: number, field: string, val: string) => {
    const next = [...lines];
    (next[i] as Record<string, string>)[field] = val;
    if (field === "productId") {
      const p = products.find(pr => pr.id === val);
      next[i].productName = p?.tradeName || "";
      next[i].unit = p?.unit || "L";
    }
    setLines(next);
  };

  const validLines = lines.filter((l: unknown) => (l as { productId: string; qty: string }).productId && (l as { productId: string; qty: string }).qty);
  const totalProducts = validLines.length;
  const totalQty = validLines.reduce((sum: number, l: unknown) => sum + (parseFloat((l as { qty: string }).qty) || 0), 0);
  const canProceed = step === 1 ? !!(selectedTreatment && selectedParcelle) : totalProducts > 0;

  const filteredProducts = productSearch
    ? products.filter(p => p.tradeName.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 30)
    : products.slice(0, 30);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 " onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95  rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/25 flex items-center justify-center">
                <Minus className="w-5 h-5 text-[var(--color-valley-green)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Consommation Traitement</h2>
                <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">Déduire le stock consommé lors d&apos;un traitement</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-1 p-1 rounded-lg bg-black/30">
            {[1, 2, 3].map((s: number) => (
              <button
                key={s}
                onClick={() => { if (s < step) setStep(s); }}
                className={cn(
                  "flex items-center gap-2 flex-1 px-3 py-2 rounded-md transition-all",
                  step === s ? "bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25" : s < step ? "hover:bg-white/[0.04] cursor-pointer border border-transparent" : "border border-transparent cursor-default"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shrink-0",
                  step > s ? "bg-[var(--color-valley-green)]/25 text-[var(--color-valley-green)]" : step === s ? "bg-[var(--color-valley-green)]/20 border border-emerald-500/40 text-[var(--color-valley-green)]" : "bg-white/[0.06] text-[var(--color-adaline-ink)]/35"
                )}>
                  {step > s ? "\u2713" : s}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", step >= s ? "text-[var(--color-adaline-ink)]/70" : "text-[var(--color-adaline-ink)]/35")}>
                  {s === 1 ? "Traitement" : s === 2 ? "Produits" : "Résumé"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step 1: Treatment info */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Date du traitement</label>
                  <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Opérateur</label>
                  <input type="text" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="Filtrer par produit..." value={productSearch} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-2">Type de traitement</label>
                <div className="grid grid-cols-2 gap-2">
                  {treatmentTypes.map((t: { id: string; label: string; icon: string; color: string }) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTreatment(t.id)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                        selectedTreatment === t.id
                          ? "border-emerald-500/40 bg-[var(--color-valley-green)]/10 shadow-[0_0_12px_rgba(6,182,212,0.08)]"
                          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0",
                        selectedTreatment === t.id ? "bg-[var(--color-valley-green)]/15" : "bg-white/[0.04]"
                      )}>
                        {t.icon}
                      </div>
                      <div>
                        <span className={cn("text-xs font-semibold block", selectedTreatment === t.id ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/70")}>{t.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50">Parcelle traitée</label>
                  <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/45">{parcelles.length} parcelles</span>
                </div>
                {parcelles.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-adaline-ink)]/35" />
                    <input type="text" className="glass-input w-full pl-9 pr-3 py-2 text-xs" placeholder="Filtrer les parcelles..." value={parcelleSearch} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParcelleSearch(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {filteredParcelles.length === 0 ? (
                    <p className="text-xs text-[var(--color-adaline-ink)]/45 text-center py-4">Aucune parcelle trouvée</p>
                  ) : filteredParcelles.map((p: Parcelle) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedParcelle(p.id)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all",
                        selectedParcelle === p.id
                          ? "border-emerald-500/40 bg-[var(--color-valley-green)]/10 shadow-[0_0_12px_rgba(6,182,212,0.06)]"
                          : "border-white/[0.06] hover:bg-white/[0.04] hover:border-white/12"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        selectedParcelle === p.id ? "border-emerald-400 bg-[var(--color-valley-green)]/10" : "border-[var(--color-mist-gray)]"
                      )}>
                        {selectedParcelle === p.id && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-sm font-medium block truncate", selectedParcelle === p.id ? "text-[var(--color-adaline-ink)]/90" : "text-[var(--color-adaline-ink)]/50")}>{p.name}</span>
                        <span className="text-[10px] text-[var(--color-adaline-ink)]/45">{p.cropType} · {p.areaHectares} ha</span>
                      </div>
                      {p.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Products */}
          {step === 2 && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/35" />
                <input
                  type="text"
                  className="glass-input w-full pl-10 pr-3 py-2.5 text-sm"
                  placeholder="Rechercher un produit..."
                  value={productSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                {lines.map((line: { productId: string; productName: string; qty: string; unit: string }, i: number) => (
                  <div key={i} className={cn(
                    "p-3 rounded-xl border transition-all",
                    line.productId ? "border-[var(--color-valley-green)]/20 bg-[var(--color-valley-green)]/[0.04]" : "border-white/[0.08] bg-white/[0.02]"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <select
                          className="glass-input w-full px-3 py-2 text-sm"
                          value={line.productId}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLine(i, "productId", e.target.value)}
                        >
                          <option value="">Sélectionner un produit...</option>
                          {filteredProducts.map((p: PhytoProduct) => <option key={p.id} value={p.id}>{p.tradeName}</option>)}
                        </select>
                      </div>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(i)} className="p-1.5 rounded-lg hover:bg-[var(--color-valley-green)]/10 text-[var(--color-adaline-ink)]/15 hover:text-[var(--color-valley-green)] transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {line.productId && (() => {
                      const stock = getStockForProduct(line.productId);
                      const qtyNum = parseFloat(line.qty) || 0;
                      const overStock = stock && qtyNum > stock.qty;
                      return (
                        <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
                          {stock && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] text-[var(--color-adaline-ink)]/45">En stock :</span>
                              <span className={cn("text-[11px] font-mono font-bold", stock.status === "critical" ? "text-[var(--color-valley-green)]" : stock.status === "low" ? "text-[var(--color-valley-green)]" : "text-green-400")}>
                                {stock.qty} {stock.unit}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] text-[var(--color-adaline-ink)]/30 block mb-1">Quantité utilisée</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  className={cn("glass-input w-24 px-3 py-2 text-sm font-mono", overStock && "border-emerald-500/40 text-[var(--color-valley-green)]")}
                                  placeholder="0"
                                  value={line.qty}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLine(i, "qty", e.target.value)}
                                />
                                <span className="text-xs text-[var(--color-adaline-ink)]/40 font-mono">{line.unit}</span>
                              </div>
                              {overStock && (
                                <span className="text-[10px] text-[var(--color-valley-green)] mt-1 block">Dépasse le stock disponible</span>
                              )}
                            </div>
                            {line.qty && qtyNum > 0 && (
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--color-adaline-ink)]/45 block">Déduction</span>
                                <span className={cn("text-sm font-mono font-bold", overStock ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]")}>-{qtyNum.toFixed(1)} {line.unit}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <button
                onClick={addLine}
                className="w-full p-3 rounded-xl border border-dashed border-[var(--color-stone-moss)] hover:border-[var(--color-valley-green)]/30 hover:bg-[var(--color-valley-green)]/[0.04] text-[var(--color-adaline-ink)]/30 hover:text-[var(--color-valley-green)] transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un produit
              </button>
            </>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <div className="p-4 bg-white/[0.02] border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/50 uppercase tracking-wider">Récapitulatif</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-adaline-ink)]/40">Traitement</span>
                    <span className="text-sm font-medium text-[var(--color-adaline-ink)]/80">
                      {treatmentTypes.find(t => t.id === selectedTreatment)?.icon}{" "}
                      {treatmentTypes.find(t => t.id === selectedTreatment)?.label}
                    </span>
                  </div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-adaline-ink)]/40">Parcelle</span>
                    <span className="text-sm font-medium text-[var(--color-adaline-ink)]/80">{parcelles.find(p => p.id === selectedParcelle)?.name || selectedParcelle}</span>
                  </div>
                  {operateur && (
                    <>
                      <div className="h-px bg-white/[0.06]" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-adaline-ink)]/40">Opérateur</span>
                        <span className="text-sm font-medium text-[var(--color-adaline-ink)]/80">{operateur}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-adaline-ink)]/40">Produits</span>
                    <span className="text-sm font-bold text-[var(--color-valley-green)]">{totalProducts} produit{totalProducts > 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/50 uppercase tracking-wider">Déductions du stock</span>
                {validLines.map((line: { productId: string; productName: string; qty: string; unit: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-valley-green)]/[0.05] border border-emerald-500/15">
                    <span className="text-sm text-[var(--color-adaline-ink)]/70">{line.productName}</span>
                    <span className="text-sm font-mono font-bold text-[var(--color-valley-green)]">-{parseFloat(line.qty).toFixed(1)} {line.unit}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/50">Total volume</span>
                  <span className="text-sm font-mono font-bold text-[var(--color-adaline-ink)]/80">{totalQty.toFixed(1)} unités</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Observations</label>
                <textarea className="glass-input w-full px-3 py-2.5 text-sm h-16 resize-none" placeholder="Conditions météo, dose appliquée..." value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* Error display */}
        {modalError && (
          <div className="mx-5 mb-2 p-3 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] text-sm">{modalError}</div>
        )}

        {/* Footer */}
        <div className="p-5 pt-4 border-t border-white/[0.08] bg-black/20">
          <div className="flex items-center justify-between">
            <div>
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] transition-all flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Retour
                </button>
              ) : (
                <button onClick={onClose} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] transition-all">Annuler</button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed}
                  className={cn(
                    "px-6 py-2.5 text-sm rounded-xl font-semibold flex items-center gap-2 transition-all",
                    canProceed
                      ? "bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30 shadow-[0_0_16px_rgba(6,182,212,0.1)]"
                      : "bg-white/[0.04] border border-white/[0.08] text-[var(--color-adaline-ink)]/25 cursor-not-allowed"
                  )}
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button className="glass-button px-6 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.15)]" onClick={async () => {
                  try {
                    for (const line of validLines) {
                      // Get product category from products list for DB enum
                      const prod = products.find(p => p.id === line.productId);
                      const prodCatDb = (prod?.category || "autre").toLowerCase().replace(/ /g, "_");
                      await insertMovement({
                        product_id: line.productId,
                        movement_type: "sortie",
                        quantity: -(parseFloat(line.qty) || 0),
                        date: new Date().toISOString().split("T")[0],
                        category: prodCatDb,
                        culture: "autre",
                        observations: `Traitement ${selectedTreatment}${operateur ? ` — Op: ${operateur}` : ""}${notes ? ` — ${notes}` : ""}`.trim(),
                      });
                    }
                    if (onSaved) await onSaved();
                    onClose();
                  } catch (err: any) {
                    console.error("Failed to save consumption:", err);
                    setModalError(err?.message || "Erreur lors de l'enregistrement");
                  }
                }}>
                  <Minus className="w-4 h-4" />
                  Confirmer la déduction
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AjustementModal({ stockLevels, onClose, onSaved }: { stockLevels: StockLevel[]; onClose: () => void; onSaved?: () => Promise<void> }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const [search, setSearch] = useState("");
  const [adjustments, setAdjustements] = useState<Record<string, string>>({});
  const [ajustError, setAjustError] = useState("");

  const filtered = useMemo(() => {
    if (!search) return stockLevels.slice(0, 30);
    const q = search.toLowerCase();
    return stockLevels.filter(s => s.productName.toLowerCase().includes(q)).slice(0, 30);
  }, [stockLevels, search]);

  const updateAdj = (id: string, val: string) => setAdjustements({ ...adjustments, [id]: val });
  const adjustedCount = Object.values(adjustments).filter(v => v !== "" && v !== undefined).length;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 " onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95  rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#1a2e1a]/95  p-6 pb-4 border-b border-white/[0.08] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/25 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-[var(--color-valley-green)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Ajustement d&apos;Inventaire</h2>
                <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">Corriger les écarts entre stock physique et stock système</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/30" />
            <input type="text" className="glass-input w-full pl-9 pr-3 py-2 text-sm" placeholder="Rechercher un produit..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="p-4">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="text-left">Produit</th>
                <th className="text-center w-24">Catégorie</th>
                <th className="text-center w-28">Stock système</th>
                <th className="text-center w-28">Stock physique</th>
                <th className="text-center w-24">Écart</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: StockLevel) => {
                const physVal = adjustments[s.productId] ?? "";
                const ecart = physVal !== "" ? (parseFloat(physVal) - s.currentQuantity) : null;
                return (
                  <tr key={s.productId}>
                    <td className="text-sm text-[var(--color-adaline-ink)]/80 font-medium">{s.productName}</td>
                    <td className="text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--color-canvas-ice)] text-[var(--color-adaline-ink)]/40 border border-[var(--color-stone-moss)]">
                        {categoryLabels[s.category as ProductCategory] || s.category}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm font-mono text-[var(--color-adaline-ink)]/60">{s.currentQuantity.toFixed(1)}</span>
                      <span className="text-[10px] text-[var(--color-adaline-ink)]/30 ml-1">{s.unit}</span>
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        className="glass-input w-24 px-2 py-1.5 text-sm text-center mx-auto"
                        placeholder="—"
                        value={physVal}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAdj(s.productId, e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      {ecart !== null ? (
                        <span className={cn("text-sm font-mono font-bold", ecart > 0 ? "text-green-400" : ecart < 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30")}>
                          {ecart > 0 ? "+" : ""}{ecart.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[var(--color-adaline-ink)]/15">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ajustError && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{ajustError}</div>
        )}
        <div className="sticky bottom-0 bg-[#1a2e1a]/95  p-6 pt-4 border-t border-white/[0.08] rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--color-adaline-ink)]/45">{adjustedCount} produit(s) ajusté(s)</p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.06] transition-all">Annuler</button>
              <button onClick={async () => {
                try {
                  const entries = Object.entries(adjustments).filter(([, v]) => v !== "" && v !== undefined);
                  for (const [productId, physVal] of entries) {
                    const stock = stockLevels.find((s: StockLevel) => s.productId === productId);
                    if (!stock) continue;
                    const physQty = parseFloat(physVal as string);
                    if (isNaN(physQty)) continue;
                    const diff = physQty - stock.currentQuantity;
                    if (diff === 0) continue;
                    // Create adjustment movement (use entree for positive, sortie for negative)
                    const prodCatDb = (stock.category || "autre").toLowerCase().replace(/ /g, "_");
                    await insertMovement({
                      product_id: productId,
                      movement_type: diff > 0 ? "entree" : "sortie",
                      quantity: diff,
                      date: new Date().toISOString().split("T")[0],
                      category: prodCatDb,
                      observations: `Ajustement inventaire: ${stock.currentQuantity} → ${physQty}`,
                    });
                    // Stock level is computed from lf_movements aggregation — no separate update needed
                  }
                  if (onSaved) await onSaved();
                  onClose();
                } catch (err: any) {
                  console.error("Failed to apply adjustments:", err);
                  setAjustError(err?.message || "Erreur lors de l'ajustement");
                }
              }} disabled={adjustedCount === 0} className={cn("glass-button px-6 py-2.5 text-sm flex items-center gap-2", adjustedCount === 0 && "opacity-40 cursor-not-allowed")}>
                <RefreshCw className="w-4 h-4" />
                Appliquer ajustements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControleModal({ products, onClose, onSaved }: { products: PhytoProduct[]; onClose: () => void; onSaved?: () => Promise<void> }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [lotNumber, setLotNumber] = useState(`LOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [expiryDate, setExpiryDate] = useState("");
  const [certificate, setCertificate] = useState("");
  const [conformity, setConformity] = useState<"conforme" | "non_conforme" | "">("");
  const [notes, setNotes] = useState("");
  const [controleError, setControleError] = useState("");

  const checks = [
    { id: "emballage", label: "Emballage intact", checked: false },
    { id: "etiquette", label: "Étiquette lisible et conforme", checked: false },
    { id: "couleur", label: "Couleur / aspect visuel correct", checked: false },
    { id: "odeur", label: "Pas d'odeur anormale", checked: false },
    { id: "certificat", label: "Certificat d'analyse présent", checked: false },
    { id: "date", label: "Date de péremption valide", checked: false },
  ];
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const toggleCheck = (id: string) => setCheckedItems({ ...checkedItems, [id]: !checkedItems[id] });
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 " onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95  rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#1a2e1a]/95  p-6 pb-4 border-b border-white/[0.08] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Contrôle Qualité</h2>
                <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">Vérifier la conformité d&apos;un lot reçu</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Produit contrôlé</label>
              <select className="glass-input w-full px-3 py-2.5 text-sm" value={selectedProductId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProductId(e.target.value)}>
                <option value="">Sélectionner le produit...</option>
                {products.slice(0, 50).map((p: PhytoProduct) => <option key={p.id} value={p.id}>{p.tradeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Date du contrôle</label>
              <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">N° Lot</label>
              <input type="text" className="glass-input w-full px-3 py-2.5 text-sm" value={lotNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLotNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Date péremption</label>
              <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" value={expiryDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">N° Certificat</label>
              <input type="text" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="CERT-XXXX" value={certificate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCertificate(e.target.value)} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <label className="text-xs font-semibold text-[var(--color-adaline-ink)]/50 uppercase tracking-wider block mb-3">Checklist de contrôle</label>
            <div className="space-y-2">
              {checks.map((c: { id: string; label: string }) => (
                <button
                  key={c.id}
                  onClick={() => toggleCheck(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                    checkedItems[c.id] ? "bg-green-500/10 border-green-500/25" : "border-white/[0.08] hover:border-white/[0.15]"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                    checkedItems[c.id] ? "bg-green-500 border-green-500" : "border-[var(--color-mist-gray)]"
                  )}>
                    {checkedItems[c.id] && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]" />}
                  </div>
                  <span className={cn("text-sm", checkedItems[c.id] ? "text-[var(--color-adaline-ink)]/80" : "text-[var(--color-adaline-ink)]/50")}>{c.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-adaline-ink)]/30">{checkedCount}/{checks.length} vérifications</span>
              <div className="h-1.5 w-32 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-green-400 transition-all duration-500" style={{ width: `${(checkedCount / checks.length) * 100}%` }} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-adaline-ink)]/50 uppercase tracking-wider block mb-2">Verdict</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConformity("conforme")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  conformity === "conforme" ? "bg-green-500/10 border-green-500/25" : "border-white/[0.08] hover:border-white/[0.15]"
                )}
              >
                <CheckCircle2 className={cn("w-5 h-5 mb-1", conformity === "conforme" ? "text-green-400" : "text-[var(--color-adaline-ink)]/35")} />
                <span className={cn("text-sm font-semibold block", conformity === "conforme" ? "text-green-400" : "text-[var(--color-adaline-ink)]/50")}>Conforme</span>
                <span className="text-[10px] text-[var(--color-adaline-ink)]/30">Lot validé pour utilisation</span>
              </button>
              <button
                onClick={() => setConformity("non_conforme")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  conformity === "non_conforme" ? "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/25" : "border-white/[0.08] hover:border-white/[0.15]"
                )}
              >
                <XCircle className={cn("w-5 h-5 mb-1", conformity === "non_conforme" ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/35")} />
                <span className={cn("text-sm font-semibold block", conformity === "non_conforme" ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/50")}>Non conforme</span>
                <span className="text-[10px] text-[var(--color-adaline-ink)]/30">Retour fournisseur requis</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--color-adaline-ink)]/50 block mb-1.5">Observations</label>
            <textarea className="glass-input w-full px-3 py-2.5 text-sm h-16 resize-none" placeholder="Remarques sur l'état du lot..." value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} />
          </div>
        </div>

        {controleError && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] text-sm">{controleError}</div>
        )}
        <div className="sticky bottom-0 bg-[#1a2e1a]/95  p-6 pt-4 border-t border-white/[0.08] rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--color-adaline-ink)]/45">Rapport de contrôle · {new Date().toLocaleDateString("fr-FR")}</p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.06] transition-all">Annuler</button>
              <button onClick={async () => {
                if (!selectedProductId || !conformity) return;
                setControleError("");
                try {
                  // Log quality control as an observation movement
                  const ctrlProduct = products.find(p => p.id === selectedProductId);
                  const ctrlCatDb = (ctrlProduct?.category || "autre").toLowerCase().replace(/ /g, "_");
                  await insertMovement({
                    product_id: selectedProductId,
                    movement_type: "entree",
                    quantity: 0,
                    date: new Date().toISOString().split("T")[0],
                    category: ctrlCatDb,
                    observations: `Contrôle qualité: ${conformity === "conforme" ? "CONFORME" : "NON CONFORME"} — Lot: ${lotNumber} — ${checkedCount}/${checks.length} vérifications — ${notes}`.trim(),
                  });
                  if (onSaved) await onSaved();
                  onClose();
                } catch (err: any) {
                  console.error("Failed to save quality control:", err);
                  setControleError(err?.message || "Erreur lors de l'enregistrement");
                }
              }} disabled={!selectedProductId || !conformity} className={cn("glass-button px-6 py-2.5 text-sm flex items-center gap-2", (!selectedProductId || !conformity) && "opacity-40 cursor-not-allowed")}>
                <ShieldCheck className="w-4 h-4" />
                Enregistrer contrôle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
