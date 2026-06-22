"use client";

import { useState, useCallback, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { MagasinierPage } from "@/components/magasinier/MagasinierBranch";
import MagSuppliersPage from "@/components/magasinier/pages/MagSuppliersPage";
import { useSuppliers, useProducts, useMovements } from "@/hooks/useData";
import { insertSupplier, updateSupplier } from "@/lib/data-provider";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import EditableCell from "@/components/ui/EditableCell";
import {
  supplierTypeLabels,
  type Supplier,
  type PhytoProduct,
  type StockEntry,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  Truck,
  Plus,
  Phone,
  MapPin,
  Package,
  ChevronRight,
  Calendar,
  Mail,
  FileText,
  ArrowRightLeft,
  X,
  DollarSign,
  Hash,
} from "lucide-react";

const supplierTypeColors: Record<string, string> = {
  distributeur: "text-[var(--color-valley-green)] bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/20",
  fournisseur: "text-green-400 bg-green-500/10 border-green-500/20",
  fabricant: "text-[var(--color-valley-green)] bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/20",
};

export default function SuppliersPage() {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <MagasinierPage mag={MagSuppliersPage} />;
  }
  return <SuppliersContent />;
}

function SuppliersContent() {
  const { data: suppliersRaw, loading: suppliersLoading, refetch: refetchSuppliers } = useSuppliers();
  const { data: productsRaw, loading: productsLoading } = useProducts();
  const { data: movementsRaw, loading: movementsLoading } = useMovements();
  const suppliers = (suppliersRaw || []) as Supplier[];
  const products = (productsRaw || []) as PhytoProduct[];
  const stockEntries = (movementsRaw || []) as StockEntry[];

  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");

  const supplierStats = useMemo(() => suppliers.map((sup: Supplier) => {
    const supplierProducts = products.filter((p: PhytoProduct) => p.supplierId === sup.id);
    const supplierEntries = stockEntries.filter((e: StockEntry) => e.supplierId === sup.id);
    const entryOnly = supplierEntries.filter((e: StockEntry) => e.type === "entry");
    const lastEntry = entryOnly.sort(
      (a: StockEntry, b: StockEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    return { ...sup, productCount: supplierProducts.length, entryCount: entryOnly.length, lastEntry, supplierProducts };
  }), [suppliers, products, stockEntries]);

  const totalDeliveries = useMemo(() => supplierStats.reduce((a: number, s: any) => a + (s.totalDeliveries ?? s.entryCount ?? 0), 0), [supplierStats]);
  const selected = useMemo(() => selectedSupplier ? supplierStats.find((s: any) => s.id === selectedSupplier) : null, [selectedSupplier, supplierStats]);

  const supplierColMap = useMemo<Record<string, { dbCol: string; type: "text" | "number" | "date" }>>(() => ({
    name: { dbCol: "name", type: "text" },
    phone: { dbCol: "phone", type: "text" },
    email: { dbCol: "email", type: "text" },
    wilaya: { dbCol: "wilaya", type: "text" },
    city: { dbCol: "city", type: "text" },
  }), []);
  const suppliersWithId = useMemo(() => supplierStats.map((s: any) => ({ ...s, id: s.id })), [supplierStats]);
  const handleSupplierSave = useCallback(async (id: string, dbUpdates: Record<string, unknown>): Promise<void> => {
    await updateSupplier(id, dbUpdates);
  }, []);
  const supEdit = useInlineEdit(suppliersWithId, (): void => {}, handleSupplierSave, supplierColMap);

  if (suppliersLoading || productsLoading || movementsLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/25 to-cyan-500/15 border border-[var(--color-valley-green)]/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Truck className="w-7 h-7 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight">Fournisseurs</h1>
              <p className="text-xs text-[var(--color-adaline-ink)]/55 mt-0.5 flex items-center gap-2">
                <ArrowRightLeft className="w-3 h-3 text-[var(--color-adaline-ink)]/40" />
                Gestion des partenaires &mdash; Approvisionnement & livraisons
              </p>
            </div>
          </div>

          {/* Right: Action button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600/80 to-amber-500/60 hover:from-amber-500/90 hover:to-amber-400/70 text-[var(--color-adaline-ink)] text-sm font-semibold flex items-center gap-2 border border-emerald-400/25 shadow-lg shadow-emerald-500/10 transition-all duration-200 hover:shadow-emerald-400/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Ajouter un fournisseur
          </button>
        </div>

        {/* KPI row */}
        <div className="relative grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
          {/* Suppliers count */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Truck className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{suppliers.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Fournisseurs actifs</p>
            </div>
          </div>

          {/* Products referenced */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{products.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Produits référencés</p>
            </div>
          </div>

          {/* Total deliveries */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{totalDeliveries}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Livraisons totales</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/55" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
            className="glass-input pl-9 pr-4 py-2 text-sm w-[260px]"
          />
        </div>
        <span className="text-xs text-[var(--color-adaline-ink)]/40">{supplierStats.filter((s: any): boolean => !search || s.name.toLowerCase().includes(search.toLowerCase())).length} fournisseurs</span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className={cn(selected ? "col-span-12 lg:col-span-7" : "col-span-12")}>
          <div className="glass-card overflow-hidden">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Type</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Wilaya</th>
                  <th className="text-center">Produits</th>
                  <th className="text-center">Livraisons</th>
                </tr>
              </thead>
              <tbody>
                {supplierStats
                  .filter((s: any) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.wilaya?.toLowerCase().includes(search.toLowerCase()))
                  .map((sup: any): React.ReactNode => {
                  const isSelected = selectedSupplier === sup.id;
                  return (
                    <tr
                      key={sup.id}
                      onClick={() => setSelectedSupplier(isSelected ? null : sup.id)}
                      className={cn("cursor-pointer", isSelected && "!bg-[var(--color-valley-green)]/[0.08]")}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 flex items-center justify-center text-xs font-bold text-[var(--color-valley-green)] shrink-0">
                            {sup.name.split(" ").map((n: string): string => n[0]).join("").slice(0, 2)}
                          </div>
                          <EditableCell
                            rowId={sup.id} col="name" value={sup.name}
                            className="text-sm font-medium text-[var(--color-adaline-ink)]/85"
                            colMap={supEdit.colMap}
                            isEditing={supEdit.isEditing(sup.id, "name")}
                            isSaving={supEdit.isSaving(sup.id, "name")}
                            editValue={supEdit.editValue}
                            setEditValue={supEdit.setEditValue}
                            editInputRef={supEdit.editInputRef}
                            startEdit={supEdit.startEdit}
                            saveEdit={supEdit.saveEdit}
                            cancelEdit={supEdit.cancelEdit}
                          />
                        </div>
                      </td>
                      <td>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-md border font-medium", supplierTypeColors[sup.type])}>
                          {supplierTypeLabels[sup.type]}
                        </span>
                      </td>
                      <td>
                        <EditableCell
                          rowId={sup.id} col="phone" value={sup.phone}
                          className="text-xs text-[var(--color-adaline-ink)]/50"
                          colMap={supEdit.colMap}
                          isEditing={supEdit.isEditing(sup.id, "phone")}
                          isSaving={supEdit.isSaving(sup.id, "phone")}
                          editValue={supEdit.editValue}
                          setEditValue={supEdit.setEditValue}
                          editInputRef={supEdit.editInputRef}
                          startEdit={supEdit.startEdit}
                          saveEdit={supEdit.saveEdit}
                          cancelEdit={supEdit.cancelEdit}
                        />
                      </td>
                      <td>
                        <EditableCell
                          rowId={sup.id} col="email" value={sup.email}
                          className="text-xs text-[var(--color-adaline-ink)]/55"
                          colMap={supEdit.colMap}
                          isEditing={supEdit.isEditing(sup.id, "email")}
                          isSaving={supEdit.isSaving(sup.id, "email")}
                          editValue={supEdit.editValue}
                          setEditValue={supEdit.setEditValue}
                          editInputRef={supEdit.editInputRef}
                          startEdit={supEdit.startEdit}
                          saveEdit={supEdit.saveEdit}
                          cancelEdit={supEdit.cancelEdit}
                        />
                      </td>
                      <td>
                        <EditableCell
                          rowId={sup.id} col="wilaya" value={sup.wilaya}
                          className="text-xs text-[var(--color-adaline-ink)]/50"
                          colMap={supEdit.colMap}
                          isEditing={supEdit.isEditing(sup.id, "wilaya")}
                          isSaving={supEdit.isSaving(sup.id, "wilaya")}
                          editValue={supEdit.editValue}
                          setEditValue={supEdit.setEditValue}
                          editInputRef={supEdit.editInputRef}
                          startEdit={supEdit.startEdit}
                          saveEdit={supEdit.saveEdit}
                          cancelEdit={supEdit.cancelEdit}
                        />
                      </td>
                      <td className="text-center">
                        <span className="text-xs font-mono text-[var(--color-adaline-ink)]/60">{sup.productCount}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-xs font-mono text-[var(--color-adaline-ink)]/50">{sup.totalDeliveries ?? sup.entryCount ?? 0}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {supplierStats.filter((s: any) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.wilaya?.toLowerCase().includes(search.toLowerCase())).length === 0 && (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/15 to-cyan-500/10 border border-[var(--color-stone-moss)] flex items-center justify-center mb-5 empty-state-icon">
                  <Truck className="w-10 h-10 text-[var(--color-adaline-ink)]/35" />
                </div>
                <h3 className="text-base font-semibold text-[var(--color-adaline-ink)]/60 mb-2">Aucun fournisseur trouvé</h3>
                <p className="text-sm text-[var(--color-adaline-ink)]/50 max-w-xs mb-6">
                  {search
                    ? "Aucun fournisseur ne correspond à votre recherche. Essayez un autre terme."
                    : "Ajoutez votre premier fournisseur pour suivre vos approvisionnements et livraisons."}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="glass-button px-5 py-2.5 flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un fournisseur
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="col-span-12 lg:col-span-5">
            <div className="glass-card p-6 sticky top-[90px]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 flex items-center justify-center text-sm font-bold text-[var(--color-valley-green)]">
                    {selected.name.split(" ").map((n: string): string => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-adaline-ink)]/85">{selected.name}</h3>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-md border font-medium",
                      supplierTypeColors[selected.type]
                    )}>
                      {supplierTypeLabels[selected.type]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-0 mb-5">
                <DetailRow label="Téléphone" value={selected.phone} />
                {selected.email && <DetailRow label="Email" value={selected.email} />}
                <DetailRow label="Ville" value={`${selected.city}, ${selected.wilaya}`} />
                {selected.registrationNumber && <DetailRow label="N° Registre Commerce" value={selected.registrationNumber} />}
                <DetailRow label="Livraisons totales" value={(selected.totalDeliveries ?? selected.entryCount ?? 0).toString()} />
                <DetailRow label="Dernière livraison" value={
                  selected.lastDeliveryDate
                    ? new Date(selected.lastDeliveryDate).toLocaleDateString("fr-FR")
                    : "—"
                } />
              </div>

              {/* Products from this supplier */}
              <div className="border-t border-white/[0.1] pt-4">
                <h4 className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/55 uppercase tracking-wider mb-3">
                  Produits fournis ({selected.productCount})
                </h4>
                <div className="space-y-2">
                  {selected.supplierProducts.map((p: PhytoProduct): React.ReactNode => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <div>
                        <span className="text-xs text-[var(--color-adaline-ink)]/60">{p.tradeName}</span>
                        <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">{p.activeSubstance} · {p.formulation}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/55">{p.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent deliveries */}
              <div className="border-t border-white/[0.1] pt-4 mt-4">
                <h4 className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/55 uppercase tracking-wider mb-3">
                  Dernières livraisons
                </h4>
                <div className="space-y-2">
                  {stockEntries
                    .filter((e: StockEntry) => e.supplierId === selected.id && (e.type === "entry"))
                    .sort((a: StockEntry, b: StockEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((e: StockEntry): React.ReactNode => (
                      <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <div>
                          <span className="text-xs text-[var(--color-adaline-ink)]/60">{e.productName}</span>
                          <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">
                            {new Date(e.date).toLocaleDateString("fr-FR")} · {e.reference}
                            {e.lotNumber && ` · ${e.lotNumber}`}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-green-400">+{e.quantity} {e.unit}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="h-8" />

      {showAddModal && (
        <AddSupplierModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); void refetchSuppliers(); }} />
      )}
    </AppLayout>
  );
}

function AddSupplierModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [form, setForm] = useState({ name: "", type: "fournisseur", phone: "", email: "", address: "", wilaya: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string): void => setForm((f: typeof form): typeof form => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await insertSupplier(form);
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 " onClick={onClose} />
      <div className="glass-card p-6 w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Nouveau Fournisseur</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Nom *</label>
            <input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("name", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: CASAP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Type</label>
              <select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => set("type", e.target.value)} className="glass-input w-full px-3 py-2 text-sm bg-transparent">
                {["fournisseur","distributeur","fabricant"].map((t: string): React.ReactNode => <option key={t} value={t} className="bg-[#1a2e1a]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Wilaya</label>
              <input value={form.wilaya} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("wilaya", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Ex: Tlemcen" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Téléphone</label>
              <input value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("phone", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="0X XX XX XX XX" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Email</label>
              <input value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("email", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="contact@..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1">Adresse</label>
            <input value={form.address} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => set("address", e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Adresse complète" />
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="glass-button w-full py-2.5 text-sm mt-5 disabled:opacity-40">
          {saving ? "Enregistrement..." : "Ajouter le fournisseur"}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-b-0">
      <span className="text-[11px] text-[var(--color-adaline-ink)]/55">{label}</span>
      <span className={cn(
        "text-[11px] font-medium text-right",
        highlight ? "text-[var(--color-valley-green)] font-mono" : "text-[var(--color-adaline-ink)]/60"
      )}>
        {value}
      </span>
    </div>
  );
}
