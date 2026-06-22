"use client";

import { useState } from "react";
import { Package, Clock, ShoppingCart, ClipboardList, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardPanelModal from "@/components/dashboard/DashboardPanelModal";
import DashboardStockOverview from "@/components/dashboard/DashboardStockOverview";
import ExpiryWidget from "@/components/dashboard/magasinier/ExpiryWidget";
import ReorderWidget from "@/components/dashboard/magasinier/ReorderWidget";
import PrepareWidget from "@/components/dashboard/magasinier/PrepareWidget";
import MovementsWidget from "@/components/dashboard/magasinier/MovementsWidget";
import DashboardMagasinierCommandPanel from "@/components/dashboard/magasinier/DashboardMagasinierCommandPanel";
import DashboardMagasinierLegend from "@/components/dashboard/magasinier/DashboardMagasinierLegend";
import {
  useMagasinierMetrics,
  type MagasinierPanelKey,
} from "@/components/dashboard/magasinier/useMagasinierMetrics";

type Tone = "neutral" | "alert" | "warn" | "ok" | "blue";

const TITLES: Record<MagasinierPanelKey, string> = {
  inventaire: "Inventaire — vue d'ensemble",
  peremptions: "Péremptions à venir",
  reappro: "À réapprovisionner",
  preparer: "Produits à préparer",
  mouvements: "Mouvements récents",
};

export default function DashboardMagasinierOverlay() {
  const [active, setActive] = useState<MagasinierPanelKey | null>(null);
  const close = () => setActive(null);
  const open = (key: MagasinierPanelKey) => setActive((cur) => (cur === key ? null : key));

  const metrics = useMagasinierMetrics();
  const { counts, lead, urgentExp, critical, expiring, low, prep } = metrics;

  const tabs: {
    key: MagasinierPanelKey;
    icon: typeof Package;
    label: string;
    count: number | null;
    tone: Tone;
    pulse?: boolean;
  }[] = [
    { key: "inventaire", icon: Package, label: "Inventaire", count: counts.products, tone: "neutral" },
    {
      key: "peremptions",
      icon: Clock,
      label: "Péremp.",
      count: counts.expiry,
      tone: urgentExp.length ? "alert" : counts.expiry ? "warn" : "neutral",
      pulse: urgentExp.length > 0,
    },
    {
      key: "reappro",
      icon: ShoppingCart,
      label: "Réappro",
      count: counts.reorder,
      tone: critical ? "alert" : counts.reorder ? "warn" : "neutral",
      pulse: critical > 0 || counts.reorder > 0,
    },
    {
      key: "preparer",
      icon: ClipboardList,
      label: "Préparer",
      count: counts.prepare,
      tone: counts.prepare ? "blue" : "neutral",
    },
    { key: "mouvements", icon: Repeat, label: "Mouv.", count: null, tone: "neutral" },
  ];

  return (
    <>
      <div className="mag-dash-overlay">
        <DashboardMagasinierCommandPanel
          lead={lead}
          expiryCount={expiring.length}
          urgentExpiry={urgentExp.length}
          reorderCount={low.length}
          critical={critical}
          prepareCount={prep.length}
          onOpenPanel={open}
        />
      </div>

      <div className="dash-mag-station" role="toolbar" aria-label="Outils magasin">
        <div className="dash-mag-cap">MAGASIN</div>
        {tabs.map(({ key, icon: Icon, label, count, tone, pulse }) => (
          <button
            key={key}
            type="button"
            className={cn("dash-mag-fab", active === key && "dash-mag-fab--active")}
            onClick={() => open(key)}
            aria-pressed={active === key}
            title={label}
          >
            <Icon className="dash-mag-fab-icon" aria-hidden />
            <span className="dash-mag-fab-label">{label}</span>
            {count != null && count > 0 && (
              <span
                className={cn(
                  "dash-mag-badge",
                  `dash-mag-badge--${tone === "blue" ? "ok" : tone}`,
                  pulse && "dash-mag-badge--pulse"
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <DashboardMagasinierLegend />

      <DashboardPanelModal open={active === "inventaire"} onClose={close} eyebrow="Magasin" title={TITLES.inventaire}>
        <DashboardStockOverview embedded />
      </DashboardPanelModal>
      <DashboardPanelModal open={active === "peremptions"} onClose={close} eyebrow="Magasin" title={TITLES.peremptions}>
        <ExpiryWidget bare />
      </DashboardPanelModal>
      <DashboardPanelModal open={active === "reappro"} onClose={close} eyebrow="Magasin" title={TITLES.reappro}>
        <ReorderWidget bare />
      </DashboardPanelModal>
      <DashboardPanelModal open={active === "preparer"} onClose={close} eyebrow="Magasin" title={TITLES.preparer}>
        <PrepareWidget bare />
      </DashboardPanelModal>
      <DashboardPanelModal open={active === "mouvements"} onClose={close} eyebrow="Magasin" title={TITLES.mouvements}>
        <MovementsWidget bare />
      </DashboardPanelModal>
    </>
  );
}
