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
import { insertMovement, updateStockLevel } from "@/lib/data-provider";
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

export function NewEntryModal({ products, suppliers, defaultType = "entree", onClose, onSaved }: { products: PhytoProduct[]; suppliers: Supplier[]; defaultType?: string; onClose: () => void; onSaved?: () => Promise<void> }) {
  const [movementType, setMovementType] = useState(defaultType);
  const [productSearch, setProductSearch] = useState("");
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

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products.filter((p: PhytoProduct) =>
      p.tradeName?.toLowerCase().includes(q) ||
      p.activeSubstance?.toLowerCase().includes(q) ||
      (categoryLabels[p.category] || "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, productSearch]);

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
      const productCategoryDb = (selectedProduct?.category || "autre").toLowerCase().replace(/ /g, "_");

      // Map UI culture values to DB culture_type enum
      const cultureDbMap: Record<string, string> = {
        "A PEPINS": "a_pepins",
        "A NOYAU": "a_noyau",
        "VIGNE": "vigne",
        "AGRUMES": "agrumes",
        "TT": "autre",
      };

      const movementData: Record<string, unknown> = {
        product_id: selectedProductId,
        movement_type: movementType,
        quantity: (movementType === "sortie") ? -qty : qty,
        date: dateValue,
        category: productCategoryDb,
      };

      // Only add optional fields if they have values
      if (selectedCulture) movementData.culture = cultureDbMap[selectedCulture] || "autre";
      if (selectedSite) movementData.site_name = selectedSite;
      if (detailsSite) movementData.details_site = detailsSite;
      if (observations) movementData.observations = observations;

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
  }, [movementType, selectedProductId, selectedCategory, quantity, dateValue, selectedCulture, selectedSite, detailsSite, selectedSupplier, observations, suppliers, products, onClose, onSaved]);

  const typeOptions = [
    { value: "entree", label: "Entrée", desc: "Réception fournisseur", color: "text-green-400", bg: "bg-green-400/10 border-green-400/25" },
    { value: "sortie", label: "Sortie", desc: "Consommation terrain", color: "text-red-400", bg: "bg-red-400/10 border-red-400/25" },
    { value: "retour", label: "Retour", desc: "Retour au magasin", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/25" },
    { value: "transfert", label: "Transfert", desc: "Inter-sites", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/25" },
  ];
  const isEntry = movementType === "entree";
  const isExit = movementType === "sortie";

  const categories = [
    "ENGRAIS", "FONGICIDE", "INSECTICIDE", "HERBICIDE", "FER",
    "ACIDE HUMIQUE", "ACIDE NITRIQUE", "ACIDE PHOSPHORIQUE", "ACIDE SULFURIQUE",
    "MATIERE ORGANIQUE", "DRMX", "AUTRE"
  ];
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
        <label id={`${dropdownId}-label`} className="text-[10px] text-white/40 block mb-1">{label}</label>
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${dropdownId}-label`}
          className="glass-input w-full px-3 py-2 text-sm text-left flex items-center justify-between"
        >
          <span className={value ? "text-white/80" : "text-white/30"}>{value || placeholder}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div role="listbox" aria-labelledby={`${dropdownId}-label`} className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#1a2e1a]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
            {options.map((o: { value: string; label: string }) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={value === o.value}
                onClick={() => { onSelect(o.value); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0",
                  value === o.value ? "bg-amber-500/10 text-amber-400" : "text-white/70"
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} onMouseDown={() => { setShowProductDropdown(false); setOpenDropdown(null); }} />
      <div className="relative bg-[#1a2e1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1a2e1a]/95 backdrop-blur-xl p-6 pb-4 border-b border-white/[0.08] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white/90">Nouveau Mouvement</h2>
              <p className="text-xs text-white/40 mt-0.5">Formulaire de saisie — conforme au registre SBA 2025</p>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Movement type selector */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-2">Type de mouvement</label>
            <div className="grid grid-cols-4 gap-2">
              {typeOptions.map((t: { value: string; label: string; desc: string; color: string; bg: string }) => (
                <button
                  key={t.value}
                  onClick={() => setMovementType(t.value)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    movementType === t.value
                      ? t.bg
                      : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
                  )}
                >
                  <span className={cn("text-sm font-semibold block", movementType === t.value ? t.color : "text-white/60")}>{t.label}</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Date</label>
              <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" value={dateValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateValue(e.target.value)} />
            </div>
            <div className="relative">
              <label className="text-xs font-medium text-white/50 block mb-1.5">
                Catégorie
                {selectedProductId && <span className="text-[10px] text-amber-400/60 ml-1.5">(auto)</span>}
              </label>
              {selectedProductId ? (
                <div className="glass-input w-full px-3 py-2.5 text-sm flex items-center justify-between opacity-70 cursor-not-allowed">
                  <span className="text-amber-400/80 font-medium">{selectedCategory}</span>
                  <span className="text-[10px] text-white/20">verrouillé</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
                    className="glass-input w-full px-3 py-2.5 text-sm text-left flex items-center justify-between"
                  >
                    <span className="text-white/80">{selectedCategory}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", openDropdown === "cat" && "rotate-180")} />
                  </button>
                  {openDropdown === "cat" && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#1a2e1a]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {categories.map((c: string) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setSelectedCategory(c); setOpenDropdown(null); }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 text-sm hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0",
                            selectedCategory === c ? "bg-amber-500/10 text-amber-400" : "text-white/70"
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

          {/* Product — searchable */}
          <div className="relative">
            <label className="text-xs font-medium text-white/50 block mb-1.5">Produit (nom commercial)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                className="glass-input w-full pl-9 pr-3 py-2.5 text-sm"
                placeholder="Taper pour rechercher un produit..."
                value={productSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
              />
              {selectedProductId && (
                <button
                  onClick={() => { setSelectedProductId(""); setProductSearch(""); setSelectedCategory("ENGRAIS"); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
                >
                  <X className="w-3 h-3 text-white/40" />
                </button>
              )}
            </div>
            {showProductDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a2e1a]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-xs text-white/30 text-center">Aucun produit trouvé</div>
                ) : (
                  filteredProducts.map((p: PhytoProduct) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setProductSearch(p.tradeName);
                        setShowProductDropdown(false);
                        // Auto-fill category from product
                        const catNorm = (p.category || "").toUpperCase().replace(/_/g, " ").trim();
                        const match = categories.find(c => c === catNorm || c.replace(/ /g, "_") === (p.category || "").toUpperCase());
                        if (match) {
                          setSelectedCategory(match);
                        } else {
                          // Fallback: use categoryLabels display name
                          const label = (categoryLabels[p.category] || "").toUpperCase();
                          const fallback = categories.find(c => c === label);
                          if (fallback) setSelectedCategory(fallback);
                        }
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0",
                        selectedProductId === p.id && "bg-amber-500/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-white/80 font-medium">{p.tradeName}</span>
                          {p.activeSubstance && (
                            <span className="text-[10px] text-white/30 ml-2">{p.activeSubstance}</span>
                          )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md border bg-white/5 text-white/40 border-white/10">
                          {categoryLabels[p.category] || p.category}
                        </span>
                      </div>
                    </button>
                  ))
                )}
                {products.length > 20 && !productSearch && (
                  <div className="p-2 text-[10px] text-white/25 text-center">Tapez pour filtrer {products.length} produits</div>
                )}
              </div>
            )}
          </div>

          {/* Quantity — dynamic based on type */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-2">Quantité (kg/L)</label>
            <div className="grid grid-cols-4 gap-3">
              <div className={cn(!isEntry && "opacity-40")}>
                <label className="text-[10px] text-green-400/70 block mb-1">Entrée</label>
                <input type="number" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="0" disabled={!isEntry} value={isEntry ? quantity : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)} />
              </div>
              <div className={cn(!isExit && "opacity-40")}>
                <label className="text-[10px] text-red-400/70 block mb-1">Sortie</label>
                <input type="number" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="0" disabled={!isExit} value={isExit ? quantity : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)} />
              </div>
              <div className={cn(movementType !== "retour" && "opacity-40")}>
                <label className="text-[10px] text-purple-400/70 block mb-1">Retour</label>
                <input type="number" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="0" disabled={movementType !== "retour"} value={movementType === "retour" ? quantity : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)} />
              </div>
              <div className={cn(movementType !== "transfert" && "opacity-40")}>
                <label className="text-[10px] text-orange-400/70 block mb-1">Transfert</label>
                <input type="number" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="0" disabled={movementType !== "transfert"} value={movementType === "transfert" ? quantity : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Destination — Culture + Site */}
          {(isExit || movementType === "transfert") && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-3">Destination</label>
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
                  <label className="text-[10px] text-white/40 block mb-1">Détails site</label>
                  <input type="text" className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: 13ha la base" value={detailsSite} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDetailsSite(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Supplier — only for entries */}
          {isEntry && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-3">Traçabilité fournisseur</label>
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
                  <label className="text-[10px] text-white/40 block mb-1">N° Bon de livraison</label>
                  <input type="text" className="glass-input w-full px-3 py-2 text-sm" value={bonLivraison} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBonLivraison(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">N° Lot</label>
                  <input type="text" className="glass-input w-full px-3 py-2 text-sm" placeholder="LOT-XXX-XXXX" value={lotNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLotNumber(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Observations */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Observations</label>
            <textarea className="glass-input w-full px-3 py-2.5 text-sm h-16 resize-none" placeholder="RS, ENTREE, RETOUR, TRANSFERT, STOCK INITIAL..." value={observations} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservations(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a2e1a]/95 backdrop-blur-xl p-6 pt-4 border-t border-white/[0.08] rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div>
              {formError && <p className="text-[10px] text-red-400 mb-1">{formError}</p>}
              <p className="text-[10px] text-white/25">Les données seront ajoutées à la table MOUVEMENT</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-white/50 hover:text-white/70 rounded-xl hover:bg-white/[0.06] transition-all">
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
        const qty = parseFloat(physVal as string);
        if (isNaN(qty)) continue;
        await updateStockLevel(productId, { current_quantity: qty });
      }
      if (onSaved) await onSaved();
      onClose();
    } catch (err: any) {
      console.error("Failed to validate inventory:", err);
      setInventoryError(err?.message || "Erreur lors de la validation de l'inventaire");
    }
    setSaving(false);
  }, [physicalCounts, onClose, onSaved]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/[0.15] w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white/90">Inventaire Physique</h2>
            <p className="text-xs text-white/40 mt-0.5">Comparer le stock physique avec le stock système</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40">
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
                    <span className="text-sm text-white/70">{stock.productName}</span>
                  </div>
                </td>
                <td>
                  <span className="text-sm font-mono text-white/60">
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
                      return <span className={cn("text-sm font-mono font-bold", ecart > 0 ? "text-green-400" : ecart < 0 ? "text-red-400" : "text-white/30")}>{ecart > 0 ? "+" : ""}{ecart.toFixed(1)}</span>;
                    })()
                  ) : (
                    <span className="text-sm font-mono text-white/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inventoryError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{inventoryError}</div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/[0.08]">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-white/50 hover:text-white/70 rounded-xl hover:bg-white/[0.04] transition-all">
            Annuler
          </button>
          <button onClick={() => window.print()} className="px-4 py-2.5 text-sm rounded-xl border border-white/[0.1] text-white/60 hover:bg-white/[0.04] transition-all flex items-center gap-2">
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                <Minus className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/90">Consommation Traitement</h2>
                <p className="text-xs text-white/40 mt-0.5">Déduire le stock consommé lors d&apos;un traitement</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
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
                  step === s ? "bg-cyan-500/15 border border-cyan-500/25" : s < step ? "hover:bg-white/[0.04] cursor-pointer border border-transparent" : "border border-transparent cursor-default"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shrink-0",
                  step > s ? "bg-cyan-500/25 text-cyan-400" : step === s ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400" : "bg-white/[0.06] text-white/20"
                )}>
                  {step > s ? "\u2713" : s}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", step >= s ? "text-white/70" : "text-white/20")}>
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
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Date du traitement</label>
                  <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1.5">Opérateur</label>
                  <input type="text" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="Filtrer par produit..." value={productSearch} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/50 block mb-2">Type de traitement</label>
                <div className="grid grid-cols-2 gap-2">
                  {treatmentTypes.map((t: { id: string; label: string; icon: string; color: string }) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTreatment(t.id)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                        selectedTreatment === t.id
                          ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.08)]"
                          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0",
                        selectedTreatment === t.id ? "bg-cyan-500/15" : "bg-white/[0.04]"
                      )}>
                        {t.icon}
                      </div>
                      <div>
                        <span className={cn("text-xs font-semibold block", selectedTreatment === t.id ? "text-cyan-400" : "text-white/70")}>{t.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-white/50">Parcelle traitée</label>
                  <span className="text-[10px] font-mono text-white/25">{parcelles.length} parcelles</span>
                </div>
                {parcelles.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                    <input type="text" className="glass-input w-full pl-9 pr-3 py-2 text-xs" placeholder="Filtrer les parcelles..." value={parcelleSearch} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParcelleSearch(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {filteredParcelles.length === 0 ? (
                    <p className="text-xs text-white/25 text-center py-4">Aucune parcelle trouvée</p>
                  ) : filteredParcelles.map((p: Parcelle) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedParcelle(p.id)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all",
                        selectedParcelle === p.id
                          ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.06)]"
                          : "border-white/[0.06] hover:bg-white/[0.04] hover:border-white/12"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        selectedParcelle === p.id ? "border-cyan-400 bg-cyan-500/10" : "border-white/20"
                      )}>
                        {selectedParcelle === p.id && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-sm font-medium block truncate", selectedParcelle === p.id ? "text-white/90" : "text-white/50")}>{p.name}</span>
                        <span className="text-[10px] text-white/25">{p.cropType} · {p.areaHectares} ha</span>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
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
                    line.productId ? "border-cyan-500/20 bg-cyan-500/[0.04]" : "border-white/[0.08] bg-white/[0.02]"
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
                        <button onClick={() => removeLine(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/15 hover:text-red-400 transition-colors">
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
                              <span className="text-[10px] text-white/25">En stock :</span>
                              <span className={cn("text-[11px] font-mono font-bold", stock.status === "critical" ? "text-red-400" : stock.status === "low" ? "text-amber-400" : "text-green-400")}>
                                {stock.qty} {stock.unit}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] text-white/30 block mb-1">Quantité utilisée</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  className={cn("glass-input w-24 px-3 py-2 text-sm font-mono", overStock && "border-red-500/40 text-red-400")}
                                  placeholder="0"
                                  value={line.qty}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLine(i, "qty", e.target.value)}
                                />
                                <span className="text-xs text-white/40 font-mono">{line.unit}</span>
                              </div>
                              {overStock && (
                                <span className="text-[10px] text-red-400 mt-1 block">Dépasse le stock disponible</span>
                              )}
                            </div>
                            {line.qty && qtyNum > 0 && (
                              <div className="text-right">
                                <span className="text-[10px] text-white/25 block">Déduction</span>
                                <span className={cn("text-sm font-mono font-bold", overStock ? "text-red-400" : "text-amber-400")}>-{qtyNum.toFixed(1)} {line.unit}</span>
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
                className="w-full p-3 rounded-xl border border-dashed border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] text-white/30 hover:text-cyan-400 transition-all flex items-center justify-center gap-2 text-xs"
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
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Récapitulatif</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Traitement</span>
                    <span className="text-sm font-medium text-white/80">
                      {treatmentTypes.find(t => t.id === selectedTreatment)?.icon}{" "}
                      {treatmentTypes.find(t => t.id === selectedTreatment)?.label}
                    </span>
                  </div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Parcelle</span>
                    <span className="text-sm font-medium text-white/80">{parcelles.find(p => p.id === selectedParcelle)?.name || selectedParcelle}</span>
                  </div>
                  {operateur && (
                    <>
                      <div className="h-px bg-white/[0.06]" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Opérateur</span>
                        <span className="text-sm font-medium text-white/80">{operateur}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Produits</span>
                    <span className="text-sm font-bold text-cyan-400">{totalProducts} produit{totalProducts > 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Déductions du stock</span>
                {validLines.map((line: { productId: string; productName: string; qty: string; unit: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/[0.05] border border-red-500/15">
                    <span className="text-sm text-white/70">{line.productName}</span>
                    <span className="text-sm font-mono font-bold text-red-400">-{parseFloat(line.qty).toFixed(1)} {line.unit}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-xs font-semibold text-white/50">Total volume</span>
                  <span className="text-sm font-mono font-bold text-white/80">{totalQty.toFixed(1)} unités</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Observations</label>
                <textarea className="glass-input w-full px-3 py-2.5 text-sm h-16 resize-none" placeholder="Conditions météo, dose appliquée..." value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* Error display */}
        {modalError && (
          <div className="mx-5 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{modalError}</div>
        )}

        {/* Footer */}
        <div className="p-5 pt-4 border-t border-white/[0.08] bg-black/20">
          <div className="flex items-center justify-between">
            <div>
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 text-sm text-white/50 hover:text-white/70 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] transition-all flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Retour
                </button>
              ) : (
                <button onClick={onClose} className="px-4 py-2.5 text-sm text-white/50 hover:text-white/70 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] transition-all">Annuler</button>
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
                      ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.1)]"
                      : "bg-white/[0.04] border border-white/[0.08] text-white/25 cursor-not-allowed"
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#1a2e1a]/95 backdrop-blur-xl p-6 pb-4 border-b border-white/[0.08] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/90">Ajustement d&apos;Inventaire</h2>
                <p className="text-xs text-white/40 mt-0.5">Corriger les écarts entre stock physique et stock système</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
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
                    <td className="text-sm text-white/80 font-medium">{s.productName}</td>
                    <td className="text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">
                        {categoryLabels[s.category as ProductCategory] || s.category}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm font-mono text-white/60">{s.currentQuantity.toFixed(1)}</span>
                      <span className="text-[10px] text-white/30 ml-1">{s.unit}</span>
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
                        <span className={cn("text-sm font-mono font-bold", ecart > 0 ? "text-green-400" : ecart < 0 ? "text-red-400" : "text-white/30")}>
                          {ecart > 0 ? "+" : ""}{ecart.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-white/15">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ajustError && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{ajustError}</div>
        )}
        <div className="sticky bottom-0 bg-[#1a2e1a]/95 backdrop-blur-xl p-6 pt-4 border-t border-white/[0.08] rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/25">{adjustedCount} produit(s) ajusté(s)</p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-white/50 hover:text-white/70 rounded-xl hover:bg-white/[0.06] transition-all">Annuler</button>
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
                    // Update stock level
                    await updateStockLevel(productId, { current_quantity: physQty });
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.15] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#1a2e1a]/95 backdrop-blur-xl p-6 pb-4 border-b border-white/[0.08] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/90">Contrôle Qualité</h2>
                <p className="text-xs text-white/40 mt-0.5">Vérifier la conformité d&apos;un lot reçu</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Produit contrôlé</label>
              <select className="glass-input w-full px-3 py-2.5 text-sm" value={selectedProductId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProductId(e.target.value)}>
                <option value="">Sélectionner le produit...</option>
                {products.slice(0, 50).map((p: PhytoProduct) => <option key={p.id} value={p.id}>{p.tradeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Date du contrôle</label>
              <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">N° Lot</label>
              <input type="text" className="glass-input w-full px-3 py-2.5 text-sm" value={lotNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLotNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Date péremption</label>
              <input type="date" className="glass-input w-full px-3 py-2.5 text-sm" value={expiryDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">N° Certificat</label>
              <input type="text" className="glass-input w-full px-3 py-2.5 text-sm" placeholder="CERT-XXXX" value={certificate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCertificate(e.target.value)} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-3">Checklist de contrôle</label>
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
                    checkedItems[c.id] ? "bg-green-500 border-green-500" : "border-white/20"
                  )}>
                    {checkedItems[c.id] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={cn("text-sm", checkedItems[c.id] ? "text-white/80" : "text-white/50")}>{c.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-white/30">{checkedCount}/{checks.length} vérifications</span>
              <div className="h-1.5 w-32 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-green-400 transition-all duration-500" style={{ width: `${(checkedCount / checks.length) * 100}%` }} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-2">Verdict</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConformity("conforme")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  conformity === "conforme" ? "bg-green-500/10 border-green-500/25" : "border-white/[0.08] hover:border-white/[0.15]"
                )}
              >
                <CheckCircle2 className={cn("w-5 h-5 mb-1", conformity === "conforme" ? "text-green-400" : "text-white/20")} />
                <span className={cn("text-sm font-semibold block", conformity === "conforme" ? "text-green-400" : "text-white/50")}>Conforme</span>
                <span className="text-[10px] text-white/30">Lot validé pour utilisation</span>
              </button>
              <button
                onClick={() => setConformity("non_conforme")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  conformity === "non_conforme" ? "bg-red-500/10 border-red-500/25" : "border-white/[0.08] hover:border-white/[0.15]"
                )}
              >
                <XCircle className={cn("w-5 h-5 mb-1", conformity === "non_conforme" ? "text-red-400" : "text-white/20")} />
                <span className={cn("text-sm font-semibold block", conformity === "non_conforme" ? "text-red-400" : "text-white/50")}>Non conforme</span>
                <span className="text-[10px] text-white/30">Retour fournisseur requis</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Observations</label>
            <textarea className="glass-input w-full px-3 py-2.5 text-sm h-16 resize-none" placeholder="Remarques sur l'état du lot..." value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} />
          </div>
        </div>

        {controleError && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{controleError}</div>
        )}
        <div className="sticky bottom-0 bg-[#1a2e1a]/95 backdrop-blur-xl p-6 pt-4 border-t border-white/[0.08] rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/25">Rapport de contrôle · {new Date().toLocaleDateString("fr-FR")}</p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-white/50 hover:text-white/70 rounded-xl hover:bg-white/[0.06] transition-all">Annuler</button>
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
