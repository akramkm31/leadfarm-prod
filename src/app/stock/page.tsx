"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { PageScreen, PageHero, AdalineButton } from "@/components/adaline/PageScreen";
import { useProducts, useSuppliers, useMovements, useStockLevels, useParcelles } from "@/hooks/useData";
import {
  categoryLabels,
  categoryColors,
  movementCategoryLabels,
  movementCategoryColors,
  type ProductCategory,
  type StockEntry,
  type StockLevel,
  type StockMovementCategory,
  type PhytoProduct,
  type Supplier,
  type Parcelle,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { updateMovement, updateStockLevel, deleteMovement, insertMovement } from "@/lib/data-provider";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import EditableCell from "@/components/ui/EditableCell";
import { downloadCSV } from "@/lib/export-csv";
import {
  Package,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Truck,
  Calendar,
  ChevronRight,
  ChevronDown,
  Minus,
  RefreshCw,
  Eye,
  FileText,
  Download,
  Upload,
  ClipboardCheck,
  RotateCcw,
  X,
  Hash,
  Warehouse,
  ArrowRightLeft,
  History,
  ShieldCheck,
  Boxes,
  ListFilter,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  Info,
  Printer,
  MoreHorizontal,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Beaker,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { KpiCard, StockCard, ProductDetailPanel, DetailRow, MovementRow, OperationCard } from "./stock-cards";
import { NewEntryModal, ConsommationModal, AjustementModal, ControleModal } from "./stock-modals";
import InventaireGuideModal from "@/components/stock/InventaireGuideModal";
import StockConformiteTab from "@/components/stock/StockConformiteTab";
import { PageSkeleton } from "@/components/ui/Skeleton";

// ── Types ──────────────────────────────────────────────
type Tab = "overview" | "products" | "movements" | "operations" | "analyses" | "conformite";
type ViewMode = "grid" | "list";
type SortField = "name" | "quantity" | "value" | "status" | "category";
type SortDir = "asc" | "desc";
type EntryFilter = "all" | "entry" | "exit" | "treatment_consumption" | "adjustment" | "transfer" | "return" | "stock_initial";
type StockFilter = "all" | "ok" | "low" | "critical";

const entryTypeLabels: Record<string, string> = {
  entry: "Entrée",
  exit: "Sortie",
  treatment_consumption: "Consommation",
  adjustment: "Ajustement",
  transfer: "Transfert",
  return: "Retour",
  stock_initial: "Stock Initial",
};

const entryTypeIcons: Record<string, typeof ArrowUpRight> = {
  entry: ArrowUpRight,
  exit: ArrowDownRight,
  treatment_consumption: Minus,
  adjustment: RefreshCw,
  transfer: ArrowRightLeft,
  return: RotateCcw,
  stock_initial: Warehouse,
};

const entryTypeColors: Record<string, string> = {
  entry: "text-green-400 bg-green-400/10 border-emerald-400/20",
  exit: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  treatment_consumption: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  adjustment: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  transfer: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  return: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  stock_initial: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
};

const statusLabels: Record<string, string> = {
  ok: "Normal",
  low: "Bas",
  critical: "Critique",
  overstock: "Surstock",
  negative: "Négatif",
};

export default function StockPage() {
  const { data: stockLevelsRaw, loading: stockLoading, refetch: refetchStock } = useStockLevels();
  const { data: stockEntriesRaw, loading: entriesLoading, refetch: refetchMovements } = useMovements();
  const { data: productsRaw, loading: productsLoading } = useProducts();
  const { data: suppliersRaw, loading: suppliersLoading } = useSuppliers();
  const { data: parcellesRaw } = useParcelles();

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchStock(), refetchMovements()]);
  }, [refetchStock, refetchMovements]);

  const stockLevels = useMemo(() => (stockLevelsRaw || []) as StockLevel[], [stockLevelsRaw]);
  const stockEntries = useMemo(() => (stockEntriesRaw || []) as StockEntry[], [stockEntriesRaw]);
  const products = useMemo(() => (productsRaw || []) as PhytoProduct[], [productsRaw]);
  const suppliers = useMemo(() => (suppliersRaw || []) as Supplier[], [suppliersRaw]);
  const parcelles = useMemo(() => (parcellesRaw || []) as Parcelle[], [parcellesRaw]);
  const dataLoading = stockLoading || entriesLoading || productsLoading || suppliersLoading;

  // ── Derived data ────────────────────────────────────────
  const uniqueCategories = useMemo(() => new Set(stockLevels.map((s: StockLevel) => s.category)).size, [stockLevels]);
  const lowStockItems = useMemo(() => stockLevels.filter((s: StockLevel) => s.status === "low" || s.status === "critical"), [stockLevels]);
  const totalEntries = useMemo(() => stockEntries.filter((e: StockEntry) => e.type === "entry").length, [stockEntries]);
  const totalExits = useMemo(() => stockEntries.filter((e: StockEntry) => e.type === "exit" || e.type === "treatment_consumption").length, [stockEntries]);
  const totalTransfers = useMemo(() => stockEntries.filter((e: StockEntry) => e.type === "transfer").length, [stockEntries]);
  const totalReturns = useMemo(() => stockEntries.filter((e: StockEntry) => e.type === "return").length, [stockEntries]);
  const totalQuantityIn = useMemo(() => stockEntries.filter((e: StockEntry) => e.quantity > 0).reduce((a: number, e: StockEntry) => a + e.quantity, 0), [stockEntries]);
  const totalQuantityOut = useMemo(() => stockEntries.filter((e: StockEntry) => e.quantity < 0).reduce((a: number, e: StockEntry) => a + Math.abs(e.quantity), 0), [stockEntries]);

  const valuePieData = useMemo(() => {
    const byCat: Record<string, number> = {};
    stockLevels.forEach((s: StockLevel) => {
      const label = categoryLabels[s.category] || s.category;
      byCat[label] = (byCat[label] || 0) + s.currentQuantity;
    });
    return Object.entries(byCat).map(([name, value]: [string, number]) => ({ name, value }));
  }, [stockLevels]);

  const stockByCategory = useMemo(() => {
    const byCat: Record<string, { quantity: number; count: number }> = {};
    stockLevels.forEach((s: StockLevel) => {
      const label = categoryLabels[s.category] || s.category;
      if (!byCat[label]) byCat[label] = { quantity: 0, count: 0 };
      byCat[label].quantity += s.currentQuantity;
      byCat[label].count += 1;
    });
    return Object.entries(byCat).map(([category, d]: [string, { quantity: number; count: number }]) => ({ category, quantity: d.quantity, count: d.count }));
  }, [stockLevels]);
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [defaultMovementType, setDefaultMovementType] = useState("entree");

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showConsommationModal, setShowConsommationModal] = useState(false);
  const [showAjustementModal, setShowAjustementModal] = useState(false);
  const [showControleModal, setShowControleModal] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Auto-dismiss page error after 5 seconds
  useEffect(() => {
    if (!pageError) return;
    const t = setTimeout(() => setPageError(null), 5000);
    return () => clearTimeout(t);
  }, [pageError]);

  const handleDeleteMovement = useCallback(async (id: string) => {
    setDeletingId(id);
    setPageError(null);
    try {
      await deleteMovement(id);
      await refetchAll();
    } catch (err: any) {
      console.error("Failed to delete movement:", err);
      setPageError(err?.message || "Erreur lors de la suppression");
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  }, [refetchAll]);

  const stockLevelColMap: Record<string, { dbCol: string; type: "text" | "number" | "date" }> = {};
  const handleStockLevelSave = useCallback(async (productId: string, dbUpdates: Record<string, unknown>) => {
    await updateStockLevel(productId, dbUpdates);
  }, []);
  const stockLevelsWithId = useMemo(() => stockLevels.map((s: StockLevel) => ({ ...s, id: s.productId })), [stockLevels]);
  const stockEdit = useInlineEdit(stockLevelsWithId, () => {}, handleStockLevelSave, stockLevelColMap);

  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const editableColMap: Record<string, { dbCol: string; type: "text" | "number" | "date" }> = {
    date: { dbCol: "date", type: "date" },
    quantity: { dbCol: "quantity", type: "number" },
    culture: { dbCol: "culture", type: "text" },
    siteName: { dbCol: "site_name", type: "text" },
    detailsSite: { dbCol: "details_site", type: "text" },
    observations: { dbCol: "observations", type: "text" },
    nUnits: { dbCol: "n_units", type: "number" },
    pUnits: { dbCol: "p_units", type: "number" },
    kUnits: { dbCol: "k_units", type: "number" },
    caUnits: { dbCol: "ca_units", type: "number" },
    zincUnits: { dbCol: "zinc_units", type: "number" },
  };

  const startEdit = useCallback((rowId: string, col: string, currentValue: string) => {
    setEditingCell({ rowId, col });
    if (col === "date" && currentValue.includes("/")) {
      const entry = stockEntries.find((e: StockEntry) => e.id === rowId);
      setEditValue(entry?.date ? new Date(entry.date).toISOString().split("T")[0] : currentValue);
    } else {
      setEditValue(currentValue);
    }
    setTimeout(() => editInputRef.current?.focus(), 20);
  }, [stockEntries]);

  const cancelEdit = useCallback(() => { setEditingCell(null); setEditValue(""); }, []);

  const saveEdit = useCallback(async () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    const colDef = editableColMap[col];
    if (!colDef) return;

    const dbValue = colDef.type === "number" ? (editValue === "" ? null : parseFloat(editValue)) :
                    colDef.type === "date" ? editValue : editValue || null;

    const cellKey = `${rowId}-${col}`;
    setSavingCell(cellKey);
    setEditingCell(null);

    try {
      await updateMovement(rowId, { [colDef.dbCol]: dbValue });
    } catch (err) {
      console.error("Failed to save:", err);
    }
    setSavingCell(null);
  }, [editingCell, editValue]);

  useEffect(() => { setChartsReady(true); }, []);

  const rotationData = useMemo(() => {
    return stockLevels.map((sl: StockLevel) => {
      const exits = stockEntries.filter((e: StockEntry) => e.productId === sl.productId && e.quantity < 0);
      const totalOut = exits.reduce((a: number, e: StockEntry) => a + Math.abs(e.quantity), 0);
      const rotationRate = sl.currentQuantity > 0 ? totalOut / sl.currentQuantity : 0;
      const daysOfStock = totalOut > 0 ? Math.round((sl.currentQuantity / (totalOut / 30))) : 999;
      return { ...sl, totalOut, rotationRate: Math.round(rotationRate * 100) / 100, daysOfStock };
    });
  }, [stockLevels, stockEntries]);

  const movementTrend = useMemo(() => {
    const days: Record<string, { date: string; entries: number; exits: number }> = {};
    stockEntries.forEach((e: StockEntry) => {
      if (!days[e.date]) days[e.date] = { date: e.date, entries: 0, exits: 0 };
      if (e.quantity > 0) days[e.date].entries += e.quantity;
      else days[e.date].exits += Math.abs(e.quantity);
    });
    return Object.values(days).sort((a: { date: string; entries: number; exits: number }, b: { date: string; entries: number; exits: number }) => a.date.localeCompare(b.date));
  }, [stockEntries]);

  // ── Filtered & sorted stock levels ──
  const filteredStock = useMemo(() => {
    let items = [...stockLevels];
    if (stockFilter !== "all") items = items.filter((s: StockLevel) => s.status === stockFilter);
    if (categoryFilter !== "all") items = items.filter((s: StockLevel) => s.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s: StockLevel) => s.productName.toLowerCase().includes(q));
    }
    items.sort((a: StockLevel, b: StockLevel) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.productName.localeCompare(b.productName); break;
        case "quantity": cmp = a.currentQuantity - b.currentQuantity; break;
        case "value": cmp = a.currentQuantity - b.currentQuantity; break;
        case "status": cmp = (a.status === "critical" ? 0 : a.status === "low" ? 1 : 2) - (b.status === "critical" ? 0 : b.status === "low" ? 1 : 2); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [stockLevels, stockFilter, categoryFilter, search, sortField, sortDir]);

  // ── Filtered entries ──
  const filteredEntries = useMemo(() => {
    let items = [...stockEntries];
    if (entryFilter !== "all") items = items.filter((e: StockEntry) => e.type === entryFilter);
    if (selectedProduct) items = items.filter((e: StockEntry) => e.productId === selectedProduct);
    if (search && tab === "movements") {
      const q = search.toLowerCase();
      items = items.filter(
        (e: StockEntry) => e.productName.toLowerCase().includes(q) || (e.reference?.toLowerCase().includes(q) ?? false)
      );
    }
    return items.sort((a: StockEntry, b: StockEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockEntries, entryFilter, selectedProduct, search, tab]);

  const handleExport = useCallback(() => {
    if (tab === "movements") {
      downloadCSV(filteredEntries.map((e: StockEntry) => ({
        date: new Date(e.date).toLocaleDateString("fr-FR"),
        produit: e.productName,
        type: entryTypeLabels[e.type] || e.type,
        quantite: e.quantity,
        unite: e.unit,
        culture: (e as any).culture || "",
        site: (e as any).siteName || "",
        detailsSite: (e as any).detailsSite || "",
        observations: (e as any).observations || "",
      })), [
        { key: "date", label: "Date" }, { key: "produit", label: "Produit" },
        { key: "type", label: "Type" }, { key: "quantite", label: "Quantité" },
        { key: "unite", label: "Unité" }, { key: "culture", label: "Culture" },
        { key: "site", label: "Site" }, { key: "detailsSite", label: "Détails Site" },
        { key: "observations", label: "Observations" },
      ], "mouvements_stock");
    } else {
      downloadCSV(stockLevels.map((s: StockLevel) => ({
        produit: s.productName,
        categorie: categoryLabels[s.category] || s.category,
        quantite: s.currentQuantity,
        unite: s.unit,
        statut: statusLabels[s.status] || s.status,
      })), [
        { key: "produit", label: "Produit" }, { key: "categorie", label: "Catégorie" },
        { key: "quantite", label: "Quantité" }, { key: "unite", label: "Unité" },
        { key: "statut", label: "Statut" },
      ], "stock_produits");
    }
  }, [tab, filteredEntries, stockLevels]);

  const selectedStockItem = selectedProduct ? stockLevels.find((s: StockLevel) => s.productId === selectedProduct) : null;

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
    { id: "products", label: "Produits en stock", icon: Boxes },
    { id: "movements", label: "Mouvements", icon: ArrowRightLeft },
    { id: "operations", label: "Opérations", icon: ClipboardCheck },
    { id: "analyses", label: "Analyses", icon: BarChart3 },
    { id: "conformite", label: "Conformité local", icon: ShieldCheck },
  ];

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  if (dataLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page-level error toast */}
      {pageError && (
        <div className="fixed top-4 right-4 z-[60] max-w-md animate-in slide-in-from-top-2 p-4 rounded-xl bg-[var(--color-valley-green)]/15  border border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)] text-sm shadow-2xl flex items-center gap-3">
          <span className="flex-1">{pageError}</span>
          <button onClick={() => setPageError(null)} className="text-[var(--color-valley-green)]/60 hover:text-[var(--color-valley-green)] text-xs font-bold shrink-0">✕</button>
        </div>
      )}

      <PageScreen className="!pt-6 !pb-10">
      <PageHero
        eyebrow="OPÉRATIONS · STOCK"
        title="Gestion de stock phytosanitaire"
        lede="Suivi en temps réel — entrées, sorties et traçabilité complète."
        actions={
          <>
            <AdalineButton variant="tertiary" onClick={() => setShowInventoryModal(true)}>
              <ClipboardCheck className="w-3.5 h-3.5" />
              Inventaire
            </AdalineButton>
            <AdalineButton variant="tertiary" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Exporter
            </AdalineButton>
            <AdalineButton
              variant="tertiary"
              onClick={() => {
                setDefaultMovementType("sortie");
                setShowNewEntryModal(true);
              }}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Sortie
            </AdalineButton>
            <AdalineButton
              variant="primary"
              onClick={() => {
                setDefaultMovementType("entree");
                setShowNewEntryModal(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle entrée
            </AdalineButton>
          </>
        }
      />

        {/* KPI row */}
        <div className="relative grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mt-5">
          {/* Products count */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{stockLevels.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Produits</p>
            </div>
          </div>

          {/* Movements */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{stockEntries.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Mouvements</p>
            </div>
          </div>

          {/* Entries */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{totalEntries}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Entrées</p>
            </div>
          </div>

          {/* Exits */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-adaline-ink)] font-mono tabular-nums leading-none">{totalExits}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Sorties</p>
            </div>
          </div>

          {/* Critical stock */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            lowStockItems.length > 0
              ? "bg-[var(--color-valley-green)]/[0.06] border-emerald-500/15 hover:bg-[var(--color-valley-green)]/[0.1]"
              : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              lowStockItems.length > 0
                ? "bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/20"
                : "bg-white/[0.06] border border-white/[0.08]"
            )}>
              <AlertTriangle className={cn("w-4 h-4", lowStockItems.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/40")} />
            </div>
            <div>
              <p className={cn(
                "text-lg font-bold font-mono tabular-nums leading-none",
                lowStockItems.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/55"
              )}>{lowStockItems.length}</p>
              <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5 uppercase tracking-wider">Critiques</p>
            </div>
          </div>
        </div>

      {/* ── Tab navigation ── */}
      <div className="flex items-center gap-0.5 mb-6 p-1 bg-black/40  rounded-xl w-fit border border-[var(--color-stone-moss)]">
        {tabs.map((t: { id: Tab; label: string; icon: typeof Package }) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedProduct(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              tab === t.id
                ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] shadow-sm border border-[var(--color-valley-green)]/30"
                : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70 hover:bg-white/[0.06] border border-transparent"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB: OVERVIEW
         ══════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <>
          {/* Quick summary bar */}
          <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <span className="text-xs text-[var(--color-adaline-ink)]/55">Résumé rapide :</span>
            <span className="text-xs text-[var(--color-adaline-ink)]/60"><span className="font-mono font-bold text-[var(--color-valley-green)]">{uniqueCategories}</span> catégories</span>
            <span className="text-[var(--color-adaline-ink)]/10">·</span>
            <span className="text-xs text-[var(--color-adaline-ink)]/60"><span className="font-mono font-bold text-[var(--color-adaline-ink)]/80">{totalQuantityIn.toFixed(0)}</span> unités entrées</span>
            <span className="text-[var(--color-adaline-ink)]/10">·</span>
            <span className="text-xs text-[var(--color-adaline-ink)]/60"><span className="font-mono font-bold text-[var(--color-adaline-ink)]/80">{totalQuantityOut.toFixed(0)}</span> unités sorties</span>
            <span className="text-[var(--color-adaline-ink)]/10">·</span>
            <span className="text-xs text-[var(--color-adaline-ink)]/60"><span className="font-mono font-bold text-[var(--color-valley-green)]">{totalTransfers}</span> transferts</span>
            <span className="text-[var(--color-adaline-ink)]/10">·</span>
            <span className="text-xs text-[var(--color-adaline-ink)]/60"><span className="font-mono font-bold text-[var(--color-valley-green)]">{totalReturns}</span> retours</span>
          </div>

          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Stock by category chart */}
            <div className="col-span-12 xl:col-span-5">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85 mb-1">Stock par Catégorie</h3>
                <p className="text-xs text-[var(--color-adaline-ink)]/55 mb-4">Quantité totale par type</p>
                <div className="h-[220px]">
                  {chartsReady && <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={stockByCategory} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                      />
                      <YAxis
                        dataKey="category"
                        type="category"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={85}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(20,35,18,0.9)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "12px",
                        }}
                        formatter={(value: unknown) => [`${Number(value).toLocaleString()}`, "Quantité"]}
                      />
                      <Bar dataKey="quantity" radius={[0, 6, 6, 0]}>
                        {stockByCategory.map((entry: { category: string; quantity: number; count: number }, index: number) => {
                          const colors = ["#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} fillOpacity={0.6} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>}
                </div>
              </div>
            </div>

            {/* Movement trend */}
            <div className="col-span-12 xl:col-span-7">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85 mb-1">Flux de Stock</h3>
                <p className="text-xs text-[var(--color-adaline-ink)]/55 mb-4">Entrées vs Sorties par jour</p>
                <div className="h-[220px]">
                  {chartsReady && <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={movementTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(20,35,18,0.9)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="entries" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Entrées" />
                      <Area type="monotone" dataKey="exits" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name="Sorties" />
                    </AreaChart>
                  </ResponsiveContainer>}
                </div>
              </div>
            </div>
          </div>

          {/* Critical alerts + recent movements */}
          <div className="grid grid-cols-12 gap-6">
            {/* Low stock alerts */}
            <div className="col-span-12 xl:col-span-5">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Alertes Stock</h3>
                    <p className="text-xs text-[var(--color-adaline-ink)]/55 mt-0.5">{lowStockItems.length} produit{lowStockItems.length > 1 ? "s" : ""} sous le seuil</p>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-[var(--color-valley-green)]" />
                </div>
                {lowStockItems.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-[var(--color-valley-green)] mb-2" />
                    <p className="text-sm text-[var(--color-adaline-ink)]/55">Tous les stocks sont normaux</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lowStockItems.map((stock: StockLevel) => {
                      const maxCap = stock.maxCapacity > 1 ? stock.maxCapacity : Math.max(stock.currentQuantity * 1.5, 100);
                      const fillPercent = Math.min((stock.currentQuantity / maxCap) * 100, 100);
                      return (
                        <div
                          key={stock.productId}
                          onClick={() => { setSelectedProduct(stock.productId); setTab("products"); }}
                          className={cn(
                            "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm",
                            stock.status === "critical"
                              ? "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/25"
                              : "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/25"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: categoryColors[stock.category] }}
                              />
                              <span className="text-sm font-medium text-[var(--color-adaline-ink)]/85">{stock.productName}</span>
                            </div>
                            <span className={cn(
                              "badge text-[10px]",
                              stock.status === "critical" ? "badge-danger" : "badge-warning"
                            )}>
                              {stock.status === "critical" ? "Critique" : "Stock bas"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  stock.status === "critical" ? "bg-emerald-400" : "bg-emerald-400"
                                )}
                                style={{ width: `${fillPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-[var(--color-adaline-ink)]/70">
                              {stock.currentQuantity} {stock.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent movements */}
            <div className="col-span-12 xl:col-span-7">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Derniers Mouvements</h3>
                    <p className="text-xs text-[var(--color-adaline-ink)]/55 mt-0.5">Historique récent</p>
                  </div>
                  <button
                    onClick={() => setTab("movements")}
                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  >
                    Voir tout →
                  </button>
                </div>
                <div className="space-y-2">
                  {stockEntries
                    .sort((a: StockEntry, b: StockEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 6)
                    .map((entry: StockEntry) => (
                      <div key={entry.id}>
                        <MovementRow entry={entry} />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: PRODUCTS (stock levels)
         ══════════════════════════════════════════════════ */}
      {tab === "products" && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/55" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="glass-input pl-9 pr-4 py-2 text-sm w-[260px]"
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-black/30  rounded-lg border border-[var(--color-stone-moss)]">
                {(["all", "critical", "low", "ok"] as const).map((f: StockFilter) => (
                  <button
                    key={f}
                    onClick={() => setStockFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      stockFilter === f
                        ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] shadow-sm border border-[var(--color-valley-green)]/25"
                        : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70"
                    )}
                  >
                    {f === "all" ? "Tous" : f === "critical" ? "Critique" : f === "low" ? "Bas" : "Normal"}
                  </button>
                ))}
              </div>
              <select
                value={categoryFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value as ProductCategory | "all")}
                className="glass-input px-3 py-2 text-xs"
              >
                <option value="all">Toutes catégories</option>
                {Object.entries(categoryLabels).map(([k, v]: [string, string]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "grid" ? "bg-[var(--color-valley-green)]/100/100/10 text-green-400" : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "list" ? "bg-[var(--color-valley-green)]/100/100/10 text-green-400" : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70"
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <span className="text-xs text-[var(--color-adaline-ink)]/40 ml-2">{filteredStock.length} produits</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Product list */}
            <div className={cn("col-span-12", selectedProduct ? "xl:col-span-7" : "xl:col-span-12")}>
              {viewMode === "list" ? (
                <div className="glass-card overflow-hidden">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th className="cursor-pointer" onClick={() => toggleSort("name")}>
                          <span className="flex items-center gap-1">
                            Produit {sortField === "name" && (sortDir === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th className="cursor-pointer" onClick={() => toggleSort("category")}>Catégorie</th>
                        <th className="cursor-pointer" onClick={() => toggleSort("quantity")}>
                          <span className="flex items-center gap-1">
                            Quantité {sortField === "quantity" && (sortDir === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th className="cursor-pointer" onClick={() => toggleSort("status")}>Statut</th>
                        <th>Jauge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map((stock: StockLevel) => {
                        const isNeg = stock.currentQuantity < 0;
                        const maxCap = stock.maxCapacity > 1 ? stock.maxCapacity : Math.max(stock.currentQuantity * 1.5, 100);
                        const fillPercent = isNeg ? 0 : Math.min((stock.currentQuantity / maxCap) * 100, 100);
                        const qtyColor = isNeg ? "text-[var(--color-valley-green)]" :
                          stock.status === "critical" ? "text-[var(--color-valley-green)]" :
                          stock.status === "low" ? "text-[var(--color-valley-green)]" : "text-green-400";
                        const statusLabel = isNeg ? "Négatif" :
                          stock.status === "critical" ? "Critique" :
                          stock.status === "low" ? "Bas" :
                          stock.status === "overstock" ? "Surstock" : "Normal";
                        const statusBadge = isNeg ? "badge-danger" :
                          stock.status === "critical" ? "badge-danger" :
                          stock.status === "low" ? "badge-warning" :
                          stock.status === "overstock" ? "badge-info" : "badge-success";
                        return (
                          <tr
                            key={stock.productId}
                            onClick={() => setSelectedProduct(selectedProduct === stock.productId ? null : stock.productId)}
                            className={cn("cursor-pointer", selectedProduct === stock.productId && "!bg-[var(--color-valley-green)]/[0.08]", isNeg && "!bg-[var(--color-valley-green)]/[0.04]")}
                          >
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[stock.category] || "#6b7280" }} />
                                <span className="text-sm font-medium text-[var(--color-adaline-ink)]/85">{stock.productName}</span>
                              </div>
                            </td>
                            <td><span className="text-xs text-[var(--color-adaline-ink)]/55">{categoryLabels[stock.category] || stock.category}</span></td>
                            <td>
                              <span className={cn("text-sm font-mono font-bold", qtyColor)}>
                                {stock.currentQuantity.toFixed(stock.currentQuantity % 1 ? 1 : 0)} {stock.unit}
                              </span>
                            </td>
                            <td>
                              <span className={cn("badge text-[10px]", statusBadge)}>
                                {statusLabel}
                              </span>
                            </td>
                            <td>
                              <div className="w-20 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    isNeg ? "bg-emerald-400" :
                                    stock.status === "critical" ? "bg-emerald-400" :
                                    stock.status === "low" ? "bg-emerald-400" : "bg-green-400"
                                  )}
                                  style={{ width: `${Math.max(fillPercent, 3)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStock.map((stock: StockLevel) => (
                    <div key={stock.productId}>
                      <StockCard
                        stock={stock}
                        isSelected={selectedProduct === stock.productId}
                        onClick={() => setSelectedProduct(selectedProduct === stock.productId ? null : stock.productId)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {filteredStock.length === 0 && (
                <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/15 to-emerald-500/10 border border-[var(--color-stone-moss)] flex items-center justify-center mb-5 empty-state-icon">
                    <Package className="w-10 h-10 text-[var(--color-adaline-ink)]/35" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-adaline-ink)]/60 mb-2">Aucun produit en stock</h3>
                  <p className="text-sm text-[var(--color-adaline-ink)]/50 max-w-xs mb-6">
                    {search || stockFilter !== "all" || categoryFilter !== "all"
                      ? "Aucun produit ne correspond à vos critères de recherche ou filtres."
                      : "Commencez par enregistrer une entrée de stock pour suivre vos produits phytosanitaires."}
                  </p>
                  {!search && stockFilter === "all" && categoryFilter === "all" && (
                    <button
                      onClick={() => { setDefaultMovementType("entree"); setShowNewEntryModal(true); }}
                      className="glass-button px-5 py-2.5 flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Nouvelle Entrée
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selectedProduct && selectedStockItem && (
              <div className="col-span-12 xl:col-span-5">
                <ProductDetailPanel
                  stock={selectedStockItem}
                  entries={filteredEntries}
                  products={products}
                  rotationData={rotationData.find((r: StockLevel & { totalOut: number; rotationRate: number; daysOfStock: number }) => r.productId === selectedProduct)}
                  onClose={() => setSelectedProduct(null)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: MOVEMENTS
         ══════════════════════════════════════════════════ */}
      {tab === "movements" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/55" />
                <input
                  type="text"
                  placeholder="Rechercher par produit ou référence..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="glass-input pl-9 pr-4 py-2 text-sm w-[300px]"
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-black/30  rounded-lg border border-[var(--color-stone-moss)] flex-wrap">
                {(["all", "entry", "exit", "treatment_consumption", "transfer", "adjustment"] as const).map((t: EntryFilter) => (
                  <button
                    key={t}
                    onClick={() => setEntryFilter(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      entryFilter === t
                        ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] shadow-sm border border-[var(--color-valley-green)]/25"
                        : "text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70"
                    )}
                  >
                    {t === "all" ? "Tous" : entryTypeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-[var(--color-adaline-ink)]/40">{filteredEntries.length} mouvements</span>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Catégorie</th>
                  <th>Produit (nom commercial)</th>
                  <th>Stock Initial 2024</th>
                  <th>Transfert</th>
                  <th>Entrée</th>
                  <th>Retour</th>
                  <th>Sortie</th>
                  <th>Culture</th>
                  <th>Site</th>
                  <th>Détails Site</th>
                  <th>Observations</th>
                  <th>N</th>
                  <th>P</th>
                  <th>K</th>
                  <th>C</th>
                  <th>Zin</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: StockEntry) => {
                  const catColor = movementCategoryColors[entry.movementCategory as StockMovementCategory] || "#6b7280";
                  const isTransfert = entry.type === "transfer";
                  const isEntree = entry.type === "entry";
                  const isRetour = entry.type === "adjustment";
                  const isSortie = entry.type === "exit" || entry.type === "treatment_consumption";

                  const isEditing = (col: string) => editingCell?.rowId === entry.id && editingCell?.col === col;
                  const isSaving = (col: string) => savingCell === `${entry.id}-${col}`;

                  const EditableCell = ({ col, value, className: cls = "text-xs text-[var(--color-adaline-ink)]/55" }: { col: string; value: string | number | null | undefined; className?: string }) => {
                    const display = value != null && value !== "" ? String(value) : "—";
                    if (isEditing(col)) {
                      return (
                        <input
                          ref={editInputRef}
                          type={editableColMap[col]?.type === "number" ? "number" : editableColMap[col]?.type === "date" ? "date" : "text"}
                          value={editValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                          onBlur={saveEdit}
                          className="bg-[var(--color-valley-green)]/10 border border-emerald-500/40 rounded px-1.5 py-0.5 text-xs text-[var(--color-adaline-ink)]/90 outline-none w-full min-w-[60px] font-mono"
                          step={editableColMap[col]?.type === "number" ? "any" : undefined}
                        />
                      );
                    }
                    return (
                      <span
                        onDoubleClick={() => startEdit(entry.id, col, display === "—" ? "" : display)}
                        className={cn(cls, "cursor-cell whitespace-nowrap hover:bg-[var(--color-valley-green)]/[0.06] hover:outline hover:outline-1 hover:outline-emerald-500/20 rounded px-0.5 -mx-0.5 transition-colors", isSaving(col) && "text-green-400")}
                        title="Double-cliquer pour modifier"
                      >
                        {display}
                      </span>
                    );
                  };

                  const qtyValue = entry.quantity;
                  const qtyCol = isTransfert ? "quantity" : isEntree ? "quantity" : isRetour ? "quantity" : isSortie ? "quantity" : null;
                  const qtyColor = isTransfert ? "text-[var(--color-valley-green)]" : isEntree ? "text-green-400" : isRetour ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]";

                  return (
                    <tr key={entry.id}>
                      <td><EditableCell col="date" value={new Date(entry.date).toLocaleDateString("fr-FR")} className="text-xs text-[var(--color-adaline-ink)]/50" /></td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border whitespace-nowrap" style={{ color: catColor, backgroundColor: catColor + "15", borderColor: catColor + "30" }}>
                          {movementCategoryLabels[entry.movementCategory]}
                        </span>
                      </td>
                      <td><span className="text-sm text-[var(--color-adaline-ink)]/70 whitespace-nowrap">{entry.productName}</span></td>
                      <td><span className="text-xs font-mono text-[var(--color-adaline-ink)]/40">{entry.stockInitial ?? "—"}</span></td>
                      <td>
                        {isTransfert ? (
                          isEditing("quantity") ? <EditableCell col="quantity" value={qtyValue} className={cn("text-sm font-mono font-bold", qtyColor)} /> :
                          <span onDoubleClick={() => startEdit(entry.id, "quantity", String(qtyValue))} className={cn("text-sm font-mono font-bold cursor-cell hover:bg-[var(--color-valley-green)]/[0.06] rounded px-0.5 -mx-0.5", qtyColor)} title="Double-cliquer pour modifier">{qtyValue} {entry.unit}</span>
                        ) : <span className="text-xs text-[var(--color-adaline-ink)]/15">—</span>}
                      </td>
                      <td>
                        {isEntree ? (
                          isEditing("quantity") ? <EditableCell col="quantity" value={qtyValue} className={cn("text-sm font-mono font-bold", qtyColor)} /> :
                          <span onDoubleClick={() => startEdit(entry.id, "quantity", String(qtyValue))} className={cn("text-sm font-mono font-bold cursor-cell hover:bg-[var(--color-valley-green)]/[0.06] rounded px-0.5 -mx-0.5", qtyColor)} title="Double-cliquer pour modifier">{qtyValue} {entry.unit}</span>
                        ) : <span className="text-xs text-[var(--color-adaline-ink)]/15">—</span>}
                      </td>
                      <td>
                        {isRetour ? (
                          isEditing("quantity") ? <EditableCell col="quantity" value={qtyValue} className={cn("text-sm font-mono font-bold", qtyColor)} /> :
                          <span onDoubleClick={() => startEdit(entry.id, "quantity", String(qtyValue))} className={cn("text-sm font-mono font-bold cursor-cell hover:bg-[var(--color-valley-green)]/[0.06] rounded px-0.5 -mx-0.5", qtyColor)} title="Double-cliquer pour modifier">{qtyValue} {entry.unit}</span>
                        ) : <span className="text-xs text-[var(--color-adaline-ink)]/15">—</span>}
                      </td>
                      <td>
                        {isSortie ? (
                          isEditing("quantity") ? <EditableCell col="quantity" value={qtyValue} className={cn("text-sm font-mono font-bold", qtyColor)} /> :
                          <span onDoubleClick={() => startEdit(entry.id, "quantity", String(qtyValue))} className={cn("text-sm font-mono font-bold cursor-cell hover:bg-[var(--color-valley-green)]/[0.06] rounded px-0.5 -mx-0.5", qtyColor)} title="Double-cliquer pour modifier">{qtyValue} {entry.unit}</span>
                        ) : <span className="text-xs text-[var(--color-adaline-ink)]/15">—</span>}
                      </td>
                      <td><EditableCell col="culture" value={entry.culture} /></td>
                      <td><EditableCell col="siteName" value={entry.siteName} /></td>
                      <td><EditableCell col="detailsSite" value={entry.detailsSite} /></td>
                      <td><EditableCell col="observations" value={entry.observations} className="text-xs text-[var(--color-adaline-ink)]/40" /></td>
                      <td><EditableCell col="nUnits" value={entry.nUnits} className="text-xs font-mono text-[var(--color-adaline-ink)]/40" /></td>
                      <td><EditableCell col="pUnits" value={entry.pUnits} className="text-xs font-mono text-[var(--color-adaline-ink)]/40" /></td>
                      <td><EditableCell col="kUnits" value={entry.kUnits} className="text-xs font-mono text-[var(--color-adaline-ink)]/40" /></td>
                      <td><EditableCell col="caUnits" value={entry.caUnits} className="text-xs font-mono text-[var(--color-adaline-ink)]/40" /></td>
                      <td><EditableCell col="zincUnits" value={entry.zincUnits} className="text-xs font-mono text-[var(--color-adaline-ink)]/40" /></td>
                      <td>
                        {confirmDeleteId === entry.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteMovement(entry.id)}
                              disabled={deletingId === entry.id}
                              className="p-1 rounded bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30 transition-colors text-[10px] font-bold"
                            >
                              {deletingId === entry.id ? "..." : "Oui"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 rounded bg-white/[0.06] text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-adaline-ink)]/70 transition-colors text-[10px]"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="p-1 rounded-md text-[var(--color-adaline-ink)]/15 hover:text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/10 transition-colors"
                            title="Supprimer ce mouvement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredEntries.length === 0 && (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-amber-500/10 border border-[var(--color-stone-moss)] flex items-center justify-center mb-5 empty-state-icon">
                  <ArrowRightLeft className="w-10 h-10 text-[var(--color-adaline-ink)]/35" />
                </div>
                <h3 className="text-base font-semibold text-[var(--color-adaline-ink)]/60 mb-2">Aucun mouvement enregistré</h3>
                <p className="text-sm text-[var(--color-adaline-ink)]/50 max-w-xs mb-6">
                  {search || entryFilter !== "all"
                    ? "Aucun mouvement ne correspond à vos critères de recherche ou filtres."
                    : "Les mouvements de stock (entrées, sorties, transferts) apparaîtront ici au fur et à mesure."}
                </p>
                {!search && entryFilter === "all" && (
                  <button
                    onClick={() => { setDefaultMovementType("entree"); setShowNewEntryModal(true); }}
                    className="glass-button px-5 py-2.5 flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Enregistrer un mouvement
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: OPERATIONS
         ══════════════════════════════════════════════════ */}
      {tab === "operations" && (
        <div className="space-y-6">
          {/* Flux de Stock */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-black/40  border border-white/[0.06] w-fit">
              <div className="w-1 h-4 rounded-full bg-green-400" />
              <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/60 uppercase tracking-wider">Flux de Stock</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <OperationCard
                icon={<ArrowUpRight className="w-5 h-5" />}
                title="Réception Marchandise"
                description="Entrée depuis bon de livraison"
                color="#10b981"
                shortcut="E"
                onClick={() => setShowNewEntryModal(true)}
              />
              <OperationCard
                icon={<ArrowDownRight className="w-5 h-5" />}
                title="Sortie de Stock"
                description="Perte, transfert, destruction"
                color="#ef4444"
                shortcut="S"
                onClick={() => { setDefaultMovementType("sortie"); setShowNewEntryModal(true); }}
              />
              <OperationCard
                icon={<Minus className="w-5 h-5" />}
                title="Consommation Traitement"
                description="Déduire stock d'un traitement"
                color="#06b6d4"
                shortcut="C"
                onClick={() => setShowConsommationModal(true)}
              />
            </div>
          </div>

          {/* Contrôle & Inventaire */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-black/40  border border-white/[0.06] w-fit">
              <div className="w-1 h-4 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/60 uppercase tracking-wider">Contrôle & Inventaire</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <OperationCard
                icon={<RefreshCw className="w-5 h-5" />}
                title="Ajustement d'Inventaire"
                description="Corriger écarts physique / système"
                color="#f59e0b"
                shortcut="A"
                onClick={() => setShowAjustementModal(true)}
              />
              <OperationCard
                icon={<ClipboardCheck className="w-5 h-5" />}
                title="Inventaire Physique"
                description="Comptage complet ou partiel"
                color="#8b5cf6"
                shortcut="I"
                onClick={() => setShowInventoryModal(true)}
              />
              <OperationCard
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Contrôle Qualité"
                description="Conformité lots, certificats, DLC"
                color="#10b981"
                shortcut="Q"
                onClick={() => setShowControleModal(true)}
              />
            </div>
          </div>

          {/* Logistique */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-black/40  border border-white/[0.06] w-fit">
              <div className="w-1 h-4 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/60 uppercase tracking-wider">Logistique</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <OperationCard
                icon={<RotateCcw className="w-5 h-5" />}
                title="Retour Fournisseur"
                description="Retour produit non conforme"
                color="#94a3b8"
                onClick={() => { setDefaultMovementType("retour"); setShowNewEntryModal(true); }}
              />
              <OperationCard
                icon={<ArrowRightLeft className="w-5 h-5" />}
                title="Transfert Inter-Sites"
                description="Transférer entre entrepôts"
                color="#3b82f6"
                onClick={() => { setDefaultMovementType("transfert"); setShowNewEntryModal(true); }}
              />
              <OperationCard
                icon={<Printer className="w-5 h-5" />}
                title="Imprimer Étiquettes"
                description="Étiquettes de stockage produits"
                color="#94a3b8"
                onClick={() => handleExport()}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: ANALYSES
         ══════════════════════════════════════════════════ */}
      {tab === "analyses" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-5">
              <span className="text-xs text-[var(--color-adaline-ink)]/55 uppercase tracking-wider block mb-1">Produits</span>
              <span className="text-2xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">{stockLevels.length}</span>
              <span className="text-xs text-[var(--color-adaline-ink)]/55 block">références en stock</span>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-[var(--color-adaline-ink)]/55 uppercase tracking-wider block mb-1">Catégories</span>
              <span className="text-2xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">{uniqueCategories}</span>
              <span className="text-xs text-[var(--color-adaline-ink)]/55 block">types de produits</span>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-[var(--color-adaline-ink)]/55 uppercase tracking-wider block mb-1">Total Entrées</span>
              <span className="text-2xl font-bold text-green-400 font-mono">
                {totalQuantityIn.toFixed(0)}
              </span>
              <span className="text-xs text-[var(--color-adaline-ink)]/55 block">unités (toutes périodes)</span>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-[var(--color-adaline-ink)]/55 uppercase tracking-wider block mb-1">Total Sorties</span>
              <span className="text-2xl font-bold text-[var(--color-valley-green)] font-mono">
                {totalQuantityOut.toFixed(0)}
              </span>
              <span className="text-xs text-[var(--color-adaline-ink)]/55 block">unités (toutes périodes)</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Pie chart */}
            <div className="col-span-12 xl:col-span-5">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85 mb-4">Répartition par Catégorie</h3>
                <div className="h-[260px]">
                  {chartsReady && <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={valuePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {valuePieData.map((entry: { name: string; value: number }, index: number) => {
                          const colors = ["#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];
                          return <Cell key={index} fill={colors[index % colors.length]} fillOpacity={0.7} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(20,35,18,0.9)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "12px",
                        }}
                        formatter={(value: unknown) => [`${Number(value).toLocaleString()}`, "Quantité"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>}
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {valuePieData.map((entry: { name: string; value: number }, index: number) => {
                    const colors = ["#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];
                    return (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                        <span className="text-[10px] text-[var(--color-adaline-ink)]/55">{entry.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rotation rates */}
            <div className="col-span-12 xl:col-span-7">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85 mb-1">Taux de Rotation</h3>
                <p className="text-xs text-[var(--color-adaline-ink)]/55 mb-4">Jours de stock restants estimés</p>
                <div className="space-y-3">
                  {rotationData.map((item: StockLevel & { totalOut: number; rotationRate: number; daysOfStock: number }) => (
                    <div key={item.productId} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[item.category] }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[var(--color-adaline-ink)]/70">{item.productName}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-sm font-mono font-bold",
                          item.daysOfStock < 15 ? "text-[var(--color-valley-green)]" :
                          item.daysOfStock < 30 ? "text-[var(--color-valley-green)]" : "text-green-400"
                        )}>
                          {item.daysOfStock > 365 ? "∞" : `${item.daysOfStock}j`}
                        </span>
                        <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">restants</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-[var(--color-adaline-ink)]/50">{item.totalOut.toFixed(1)} {item.unit}</span>
                        <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">consommé</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Value table */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Détail du Stock</h3>
            </div>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Quantité</th>
                  <th>Statut</th>
                  <th>Remplissage</th>
                </tr>
              </thead>
              <tbody>
                {stockLevels
                  .sort((a: StockLevel, b: StockLevel) => b.currentQuantity - a.currentQuantity)
                  .map((stock: StockLevel) => {
                    const maxCap = stock.maxCapacity > 1 ? stock.maxCapacity : Math.max(stock.currentQuantity * 1.5, 100);
                    const fillPercent = Math.min((stock.currentQuantity / maxCap) * 100, 100);
                    return (
                    <tr key={stock.productId}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[stock.category] }} />
                          <span className="text-sm font-medium text-[var(--color-adaline-ink)]/70">{stock.productName}</span>
                        </div>
                      </td>
                      <td><span className="text-xs text-[var(--color-adaline-ink)]/55">{categoryLabels[stock.category]}</span></td>
                      <td><span className="text-sm font-mono font-bold text-[var(--color-adaline-ink)]/85">{stock.currentQuantity} {stock.unit}</span></td>
                      <td>
                        <span className={cn(
                          "badge text-[10px]",
                          stock.status === "critical" ? "badge-danger" :
                          stock.status === "low" ? "badge-warning" : "badge-success"
                        )}>
                          {statusLabels[stock.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                stock.status === "critical" ? "bg-emerald-400" :
                                stock.status === "low" ? "bg-emerald-400" : "bg-green-400"
                              )}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--color-adaline-ink)]/55 font-mono">
                            {fillPercent.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      </PageScreen>

      {/* ── Modals ── */}
      {tab === "conformite" && <StockConformiteTab />}

      {showNewEntryModal && <NewEntryModal products={products} suppliers={suppliers} defaultType={defaultMovementType} onClose={() => setShowNewEntryModal(false)} onSaved={refetchAll} />}
      {showInventoryModal && <InventaireGuideModal stockLevels={stockLevels} onClose={() => setShowInventoryModal(false)} onSaved={refetchAll} />}
      {showConsommationModal && <ConsommationModal products={products} parcelles={parcelles} stockLevels={stockLevels} onClose={() => setShowConsommationModal(false)} onSaved={refetchAll} />}
      {showAjustementModal && <AjustementModal stockLevels={stockLevels} onClose={() => setShowAjustementModal(false)} onSaved={refetchAll} />}
      {showControleModal && <ControleModal products={products} onClose={() => setShowControleModal(false)} onSaved={refetchAll} />}

      <div className="h-8" />
    </AppLayout>
  );
}

