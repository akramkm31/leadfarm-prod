"use client";

import { useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Grid,
  List,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import {
  useProducts,
  useSuppliers,
  useMovements,
  useStockLevels,
  useParcelles,
} from "@/hooks/useData";
import {
  categoryLabels,
  movementCategoryLabels,
  type StockEntry,
  type StockLevel,
  type PhytoProduct,
  type Supplier,
  type Parcelle,
} from "@/lib/mock-data";
import {
  MagPage,
  MagActionRow,
  MagBtn,
  MagTabs,
  MagKpi,
  MagChip,
  MagCardFlat,
  MagCardHead,
  MagEmpty,
  MagBadge,
} from "@/components/magasinier/ui";
import {
  distRow,
  expiryBadge,
  formatDZD,
  formatMagDate,
  formatMagQty,
  gaugeBar,
  prodIcon,
  statusBadge,
} from "@/lib/magasinier/helpers";
import { daysUntil as daysUntilWidget } from "@/components/dashboard/magasinier/WidgetShell";
import StockConformiteTab from "@/components/stock/StockConformiteTab";
import RealStockView from "@/components/stock/RealStockView";
import {
  NewEntryModal,
  ConsommationModal,
  AjustementModal,
  ControleModal,
  InventoryModal,
} from "@/app/stock/stock-modals";
import { downloadCSV } from "@/lib/export-csv";
import { PageSkeleton } from "@/components/ui/Skeleton";

type Tab = "stock_reel" | "overview" | "products" | "movements" | "operations" | "analyses" | "conformite";
type StockFilter = "all" | "ok" | "low" | "critical" | "overstock" | "alert";
type ModalKey = "entry" | "consume" | "exit" | "adjust" | "control" | "inventory" | null;

export default function MagStockPage() {
  const { data: stockRaw, loading: sl, refetch: refetchStock } = useStockLevels();
  const { data: movRaw, loading: ml, refetch: refetchMov } = useMovements();
  const { data: productsRaw, loading: pl } = useProducts();
  const { data: suppliersRaw } = useSuppliers();
  const { data: parcellesRaw } = useParcelles();

  const stockLevels = (stockRaw ?? []) as StockLevel[];
  const movements = (movRaw ?? []) as StockEntry[];
  const products = (productsRaw ?? []) as PhytoProduct[];
  const suppliers = (suppliersRaw ?? []) as Supplier[];
  const parcelles = (parcellesRaw ?? []) as Parcelle[];

  const [tab, setTab] = useState<Tab>("stock_reel");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modal, setModal] = useState<ModalKey>(null);

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchStock(), refetchMov()]);
  }, [refetchStock, refetchMov]);

  const expiring = useMemo(
    () => stockLevels.filter((s) => s.expiryDate && daysUntilWidget(s.expiryDate) <= 30),
    [stockLevels]
  );
  const low = useMemo(
    () => stockLevels.filter((s) => s.currentQuantity <= s.minThreshold),
    [stockLevels]
  );

  const filteredStock = useMemo(() => {
    return stockLevels.filter((s) => {
      if (filter === "all") return true;
      if (filter === "alert") return s.status === "low" || s.status === "critical";
      return s.status === filter;
    });
  }, [stockLevels, filter]);

  const tabs = [
    { id: "stock_reel", label: "Stock réel" },
    { id: "overview", label: "Synthèse" },
    { id: "products", label: "Produits", count: stockLevels.length },
    { id: "movements", label: "Mouvements", count: movements.length },
    { id: "operations", label: "Opérations" },
    { id: "analyses", label: "Analyses" },
    { id: "conformite", label: "Conformité" },
  ];

  if (sl || ml || pl) return <PageSkeleton />;

  return (
    <MagPage>
      <MagActionRow>
        <MagBtn onClick={() => setModal("control")}>
          <ClipboardCheck className="w-4 h-4" />
          Contrôle
        </MagBtn>
        <MagBtn
          onClick={() =>
            downloadCSV(
              stockLevels.map((s) => ({
                produit: s.productName,
                quantite: s.currentQuantity,
                unite: s.unit,
                statut: s.status,
              })),
              [
                { key: "produit", label: "Produit" },
                { key: "quantite", label: "Quantité" },
                { key: "unite", label: "Unité" },
                { key: "statut", label: "Statut" },
              ],
              "inventaire"
            )
          }
        >
          <Download className="w-4 h-4" />
          Export
        </MagBtn>
        <MagBtn primary onClick={() => setModal("entry")}>
          <Plus className="w-4 h-4" />
          Entrée stock
        </MagBtn>
      </MagActionRow>

      <MagCardFlat>
        <MagTabs tabs={tabs} active={tab} onChange={(id) => setTab(id as Tab)} />
        <div style={{ padding: tab === "stock_reel" ? 0 : 16 }}>
          {tab === "stock_reel" && (
            <RealStockView
              onEntree={(name) => setModal("entry")}
              onSortie={(name) => setModal("exit")}
            />
          )}
          {tab === "overview" && (
            <OverviewTab
              stockLevels={stockLevels}
              expiring={expiring}
              low={low}
              onOpenEntry={() => setModal("entry")}
            />
          )}
          {tab === "products" && (
            <ProductsTab
              rows={filteredStock}
              filter={filter}
              view={view}
              onFilter={setFilter}
              onView={setView}
              onExit={() => setModal("exit")}
            />
          )}
          {tab === "movements" && <MovementsTab movements={movements} products={products} />}
          {tab === "operations" && <OperationsTab onOpen={setModal} />}
          {tab === "analyses" && <AnalysesTab stockLevels={stockLevels} movements={movements} />}
          {tab === "conformite" && <StockConformiteTab />}
        </div>
      </MagCardFlat>

      {modal === "entry" && (
        <NewEntryModal products={products} suppliers={suppliers} onClose={() => setModal(null)} onSaved={refetchAll} />
      )}
      {modal === "exit" && (
        <NewEntryModal products={products} suppliers={suppliers} defaultType="sortie" onClose={() => setModal(null)} onSaved={refetchAll} />
      )}
      {modal === "consume" && (
        <ConsommationModal products={products} parcelles={parcelles} stockLevels={stockLevels} onClose={() => setModal(null)} onSaved={refetchAll} />
      )}
      {modal === "adjust" && (
        <AjustementModal stockLevels={stockLevels} onClose={() => setModal(null)} onSaved={refetchAll} />
      )}
      {modal === "control" && (
        <ControleModal products={products} onClose={() => setModal(null)} onSaved={refetchAll} />
      )}
      {modal === "inventory" && (
        <InventoryModal stockLevels={stockLevels} onClose={() => setModal(null)} onSaved={refetchAll} />
      )}
    </MagPage>
  );
}

function OverviewTab({
  stockLevels,
  expiring,
  low,
  onOpenEntry,
}: {
  stockLevels: StockLevel[];
  expiring: StockLevel[];
  low: StockLevel[];
  onOpenEntry: () => void;
}) {
  const okN = stockLevels.filter((s) => s.status === "ok").length;
  const lowN = stockLevels.filter((s) => s.status === "low").length;
  const critN = stockLevels.filter((s) => s.status === "critical").length;
  const overN = stockLevels.filter((s) => s.status === "overstock").length;
  const urgentExp = expiring.filter((s) => s.expiryDate && daysUntilWidget(s.expiryDate) <= 7).length;
  const catCount = new Set(stockLevels.map((s) => s.category)).size;

  return (
    <>
      <div className="mag-kpi-grid mag-kpi-grid--4">
        <MagKpi
          hero
          label="Références"
          value={stockLevels.length}
          unit="produits"
          icon={<Boxes className="w-3.5 h-3.5" />}
          sub={`${catCount} catégories`}
          subTone="flat"
        />
        <MagKpi
          label="Sous seuil"
          value={lowN + critN}
          unit="à réappro."
          valueColor={critN ? "var(--mag-red)" : "var(--mag-amber)"}
          icon={<Scale className="w-3.5 h-3.5" />}
          sub={critN ? `${critN} critique${critN > 1 ? "s" : ""}` : lowN ? "à commander" : "Stock sain"}
          subTone={critN ? "down" : lowN ? "warn" : "up"}
        />
        <MagKpi
          label="Péremption ≤30j"
          value={expiring.length}
          unit="lots"
          valueColor={expiring.length ? "var(--mag-red)" : "var(--mag-primary)"}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          sub={urgentExp ? `${urgentExp} à ≤7 jours` : expiring.length ? "à surveiller" : "Aucune urgence"}
          subTone={urgentExp ? "down" : expiring.length ? "warn" : "up"}
        />
      </div>

      <div className="mag-grid-2">
        <MagCardFlat>
          <MagCardHead
            title="Alertes actives"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            right={<span className="mag-muted" style={{ fontSize: 11.5 }}>{low.length + expiring.length} éléments</span>}
          />
          <div>
            {[...low, ...expiring].length === 0 ? (
              <MagEmpty icon={<CheckCircle2 className="w-8 h-8 opacity-30" />} title="Aucune alerte active" />
            ) : (
              [...low, ...expiring].map((s) => (
                <div
                  key={s.productId}
                  className="mag-row-between"
                  style={{ padding: "9px 14px", borderBottom: "1px solid var(--mag-border-light)", gap: 12 }}
                >
                  {prodIcon(s.category, 32)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.productName}</div>
                    <div className="mag-muted" style={{ fontSize: 11 }}>
                      {s.expiryDate && expiring.includes(s)
                        ? `Lot ${s.lotNumber} · ${formatMagDate(s.expiryDate)}`
                        : `${formatMagQty(s.currentQuantity)} ${s.unit} / seuil ${s.minThreshold}`}
                    </div>
                  </div>
                  {s.expiryDate && expiring.includes(s) ? expiryBadge(s.expiryDate) : statusBadge(s.status)}
                  <MagBtn sm onClick={onOpenEntry}>
                    {expiring.includes(s) ? "Perte" : "Commander"}
                  </MagBtn>
                </div>
              ))
            )}
          </div>
        </MagCardFlat>

        <MagCardFlat>
          <MagCardHead title="Répartition" icon={<Grid className="w-3.5 h-3.5" />} />
          <div style={{ padding: 14 }}>
            {distRow("Sain (OK)", okN, stockLevels.length, "#16a34a")}
            {distRow("Bas", lowN, stockLevels.length, "#d97706")}
            {distRow("Critique", critN, stockLevels.length, "#dc2626")}
            {distRow("Surstock", overN, stockLevels.length, "#2563eb")}
          </div>
        </MagCardFlat>
      </div>
    </>
  );
}

function ProductsTab({
  rows,
  filter,
  view,
  onFilter,
  onView,
  onExit,
}: {
  rows: StockLevel[];
  filter: StockFilter;
  view: "grid" | "list";
  onFilter: (f: StockFilter) => void;
  onView: (v: "grid" | "list") => void;
  onExit: () => void;
}) {
  const filters: { id: StockFilter; label: string }[] = [
    { id: "all", label: "Tous" },
    { id: "ok", label: "OK" },
    { id: "low", label: "Bas" },
    { id: "critical", label: "Critique" },
    { id: "overstock", label: "Surstock" },
  ];

  return (
    <>
      <div className="mag-row-between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div className="mag-chips">
          {filters.map((f) => (
            <MagChip key={f.id} active={filter === f.id} onClick={() => onFilter(f.id)}>
              {f.label}
            </MagChip>
          ))}
        </div>
        <div className="mag-seg">
          <button type="button" className={view === "grid" ? "mag-seg--active" : ""} onClick={() => onView("grid")}>
            <Grid className="w-3.5 h-3.5" /> Grille
          </button>
          <button type="button" className={view === "list" ? "mag-seg--active" : ""} onClick={() => onView("list")}>
            <List className="w-3.5 h-3.5" /> Liste
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="mag-grid-cards">
          {rows.map((s) => (
            <div key={s.productId} className="mag-card mag-card-pad">
              <div className="mag-row-between" style={{ marginBottom: 12 }}>
                <div className="mag-row" style={{ gap: 8 }}>
                  {prodIcon(s.category, 40)}
                  <div>
                    <div style={{ fontWeight: 800 }}>{s.productName}</div>
                    <div className="mag-muted" style={{ fontSize: 11 }}>
                      {categoryLabels[s.category] || s.category}
                    </div>
                  </div>
                </div>
                {statusBadge(s.status)}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em" }}>
                {formatMagQty(s.currentQuantity)} <span className="mag-muted" style={{ fontSize: 14, fontWeight: 600 }}>{s.unit}</span>
              </div>
              {gaugeBar(s)}
              <div className="mag-row-between" style={{ marginTop: 12, borderTop: "1px solid var(--mag-border-light)", paddingTop: 11 }}>
                {expiryBadge(s.expiryDate)}
                <MagBtn sm primary onClick={onExit}>
                  Sortie
                </MagBtn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mag-card--flat">
          <div className="mag-table-wrap">
            <table className="mag-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Lot</th>
                  <th className="mag-td-num">Stock</th>
                  <th>Statut</th>
                  <th>Péremption</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.productId}>
                    <td>
                      <div className="mag-row" style={{ gap: 8 }}>
                        {prodIcon(s.category, 30)}
                        <span style={{ fontWeight: 700 }}>{s.productName}</span>
                      </div>
                    </td>
                    <td className="mag-mono mag-muted" style={{ fontSize: 11 }}>{s.lotNumber || "—"}</td>
                    <td className="mag-td-num" style={{ fontWeight: 700 }}>
                      {formatMagQty(s.currentQuantity)} {s.unit}
                    </td>
                    <td>{statusBadge(s.status)}</td>
                    <td>{expiryBadge(s.expiryDate)}</td>
                    <td>
                      <MagBtn sm onClick={onExit}>
                        Sortie
                      </MagBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function MovementsTab({ movements, products }: { movements: StockEntry[]; products: PhytoProduct[] }) {
  const sorted = [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const prodMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="mag-card--flat">
      <div className="mag-table-wrap">
        <table className="mag-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Produit</th>
              <th>Référence</th>
              <th className="mag-td-num">Quantité</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const p = prodMap.get(m.productId);
              const sign = m.quantity >= 0 ? "+" : "";
              const color = m.quantity >= 0 ? "var(--mag-primary)" : "var(--mag-amber)";
              return (
                <tr key={m.id}>
                  <td className="mag-mono mag-muted" style={{ fontSize: 11 }}>
                    {formatMagDate(m.date)}
                  </td>
                  <td>
                    <MagBadge tone="gray" dot={false}>
                      {movementCategoryLabels[m.movementCategory] || m.type}
                    </MagBadge>
                  </td>
                  <td>
                    <div className="mag-row" style={{ gap: 8 }}>
                      {prodIcon(p?.category, 26)}
                      <span style={{ fontWeight: 600 }}>{m.productName || p?.tradeName}</span>
                    </div>
                  </td>
                  <td className="mag-muted">{m.supplierName || m.siteName || m.notes || "—"}</td>
                  <td className="mag-td-num" style={{ fontWeight: 800, color }}>
                    {sign}
                    {formatMagQty(Math.abs(m.quantity))} {m.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperationsTab({ onOpen }: { onOpen: (k: ModalKey) => void }) {
  const ops = [
    { key: "entry" as const, icon: ArrowDownLeft, color: "var(--mag-primary)", bg: "var(--mag-primary-light)", title: "Entrée fournisseur", desc: "Réception d'une livraison + lot" },
    { key: "consume" as const, icon: Plus, color: "var(--mag-blue)", bg: "var(--mag-blue-light)", title: "Consommation traitement", desc: "Sortie liée à une parcelle + traitement" },
    { key: "exit" as const, icon: ArrowUpRight, color: "var(--mag-text-secondary)", bg: "var(--mag-bg)", title: "Sortie de stock", desc: "Sortie terrain ou transfert cuve" },
    { key: "adjust" as const, icon: Scale, color: "var(--mag-violet)", bg: "var(--mag-violet-light)", title: "Ajustement inventaire", desc: "Correction d'écart tracée" },
    { key: "control" as const, icon: ClipboardCheck, color: "var(--mag-primary)", bg: "var(--mag-primary-light)", title: "Contrôle physique", desc: "Comptage et rapprochement" },
    { key: "inventory" as const, icon: Trash2, color: "var(--mag-red)", bg: "var(--mag-red-light)", title: "Perte péremption", desc: "Destruction d'un lot périmé" },
  ];

  return (
    <div className="mag-grid-cards">
      {ops.map((o) => (
        <button
          key={o.key}
          type="button"
          className="mag-card mag-card-pad"
          style={{ textAlign: "left", cursor: "pointer" }}
          onClick={() => onOpen(o.key)}
        >
          <div className="mag-row" style={{ gap: 12, marginBottom: 12 }}>
            <div className="mag-prod-icon" style={{ background: o.bg, color: o.color }}>
              <o.icon className="w-4 h-4" />
            </div>
            <div style={{ fontWeight: 800 }}>{o.title}</div>
          </div>
          <div className="mag-muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {o.desc}
          </div>
        </button>
      ))}
    </div>
  );
}

function AnalysesTab({ stockLevels, movements }: { stockLevels: StockLevel[]; movements: StockEntry[] }) {
  const byCat: Record<string, number> = {};
  stockLevels.forEach((s) => {
    const l = categoryLabels[s.category] || s.category;
    byCat[l] = (byCat[l] || 0) + (s.currentQuantity || 0);
  });
  const maxV = Math.max(...Object.values(byCat), 1);

  const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const monthlyData = useMemo(() => {
    const totals = Array(12).fill(0);
    movements.forEach((m) => {
      const d = new Date(m.date);
      if (d.getFullYear() === 2026) totals[d.getMonth()] += Math.abs(m.quantity ?? 0);
    });
    const lastIdx = new Date().getMonth();
    return MONTHS.slice(0, lastIdx + 1).map((name, i) => ({ name, value: totals[i] }));
  }, [movements]);

  const maxM = Math.max(...monthlyData.map((d) => d.value), 1);

  return (
    <div className="mag-grid-2">
      <MagCardFlat>
        <MagCardHead title="Mouvements mensuels — 2026" />
        <div style={{ padding: 16 }}>
          {monthlyData.length === 0 ? (
            <div className="mag-muted" style={{ fontSize: 12, textAlign: "center", padding: "24px 0" }}>
              Aucun mouvement enregistré en 2026
            </div>
          ) : (
            monthlyData.map(({ name, value }) => (
              <div key={name} className="mag-row-between" style={{ marginBottom: 8, fontSize: 12 }}>
                <span style={{ width: 28 }}>{name}</span>
                <div className="mag-gauge" style={{ flex: 1, margin: "0 12px" }}>
                  <div className="mag-gauge-fill" style={{ width: `${(value / maxM) * 100}%`, background: "var(--mag-primary)" }} />
                </div>
                <span className="mag-mono" style={{ width: 52, textAlign: "right" }}>
                  {value === 0 ? "—" : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(value % 1 === 0 ? 0 : 1)}
                </span>
              </div>
            ))
          )}
        </div>
      </MagCardFlat>
      <MagCardFlat>
        <MagCardHead title="Quantité par catégorie" icon={<Boxes className="w-3.5 h-3.5" />} />
        <div style={{ padding: 18 }}>
          {Object.entries(byCat).map(([label, val]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div className="mag-row-between" style={{ fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: "var(--mag-text-secondary)" }}>{label}</span>
                <span className="mag-mono" style={{ fontWeight: 700 }}>
                  {formatMagQty(val)}
                </span>
              </div>
              <div className="mag-gauge" style={{ height: 8 }}>
                <div className="mag-gauge-fill" style={{ width: `${(val / maxV) * 100}%`, background: "var(--mag-primary)" }} />
              </div>
            </div>
          ))}
        </div>
      </MagCardFlat>
    </div>
  );
}
