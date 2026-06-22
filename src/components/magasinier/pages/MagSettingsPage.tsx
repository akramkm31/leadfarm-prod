"use client";

import { useState } from "react";
import { Database, Globe, Lock, MapPin, Download } from "lucide-react";
import {
  MagPage,
  MagBtn,
  MagNotice,
  MagCardFlat,
  MagCardHead,
} from "@/components/magasinier/ui";
import { MagRoleChip } from "@/components/magasinier/MagRouteMeta";

function ToggleRow({ title, desc, defaultOn }: { title: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <div
      className="mag-row-between"
      style={{ padding: "11px 0", borderTop: "1px solid var(--mag-border-light)", gap: 16 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div className="mag-muted" style={{ fontSize: 11.5, marginTop: 1, lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>
      <button
        type="button"
        className={`mag-toggle ${on ? "mag-toggle--on" : ""}`}
        onClick={() => setOn(!on)}
        aria-pressed={on}
      >
        <span className="mag-toggle-knob" />
      </button>
    </div>
  );
}

export default function MagSettingsPage() {
  return (
    <MagPage narrow>
      <MagCardFlat>
        <MagCardHead title="Exploitation" icon={<MapPin className="w-3.5 h-3.5" />} />
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label className="block">
              <span className="mag-label-sm" style={{ display: "block", marginBottom: 6 }}>
                Exploitation
              </span>
              <input className="w-full px-3 py-2 border border-[var(--mag-border)] rounded-lg text-sm" defaultValue="Domaine Khelifa" />
            </label>
            <label className="block">
              <span className="mag-label-sm" style={{ display: "block", marginBottom: 6 }}>
                Wilaya
              </span>
              <input className="w-full px-3 py-2 border border-[var(--mag-border)] rounded-lg text-sm" defaultValue="Sidi Bel Abbès" />
            </label>
          </div>
          <label className="block mt-3">
            <span className="mag-label-sm" style={{ display: "block", marginBottom: 6 }}>
              Magasin / dépôt
            </span>
            <input className="w-full px-3 py-2 border border-[var(--mag-border)] rounded-lg text-sm" defaultValue="Magasin principal — Sidi Brahim" />
          </label>
        </div>
      </MagCardFlat>

      <div style={{ height: 16 }} />

      <MagCardFlat>
        <MagCardHead title="Langue & notifications" icon={<Globe className="w-3.5 h-3.5" />} />
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 8 }}>
            <label className="block">
              <span className="mag-label-sm" style={{ display: "block", marginBottom: 6 }}>
                Langue
              </span>
              <select className="w-full px-3 py-2 border border-[var(--mag-border)] rounded-lg text-sm">
                <option>Français</option>
                <option>العربية</option>
              </select>
            </label>
            <label className="block">
              <span className="mag-label-sm" style={{ display: "block", marginBottom: 6 }}>
                Unité par défaut
              </span>
              <select className="w-full px-3 py-2 border border-[var(--mag-border)] rounded-lg text-sm">
                <option>Litres / Kilogrammes</option>
              </select>
            </label>
          </div>
          <ToggleRow title="Alerte stock bas" desc="Notification dès qu'un produit passe sous le seuil" defaultOn />
          <ToggleRow title="Alerte péremption" desc="Lots à 30 jours d'échéance" defaultOn />
          <ToggleRow title="Résumé hebdomadaire" desc="Email récapitulatif chaque lundi" />
        </div>
      </MagCardFlat>

      <div style={{ height: 16 }} />

      <MagCardFlat>
        <MagCardHead title="Sécurité & rôle" icon={<Lock className="w-3.5 h-3.5" />} />
        <div style={{ padding: 16 }}>
          <div className="mag-row-between" style={{ paddingBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Rôle actuel</div>
              <div className="mag-muted" style={{ fontSize: 12 }}>
                Magasinier phyto
              </div>
            </div>
            <MagRoleChip />
          </div>
          <MagNotice tone="amber" icon={<Lock className="w-4 h-4" />}>
            La <strong>gestion des rôles</strong> est en lecture seule pour votre profil. Contactez l&apos;administrateur
            de l&apos;exploitation pour toute modification de permissions.
          </MagNotice>
          <MagBtn style={{ marginTop: 16 }}>
            <Lock className="w-4 h-4" />
            Changer le mot de passe
          </MagBtn>
        </div>
      </MagCardFlat>

      <div style={{ height: 16 }} />

      <MagCardFlat>
        <MagCardHead title="Données & export" icon={<Database className="w-3.5 h-3.5" />} />
        <div style={{ padding: 16 }}>
          <div className="mag-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <MagBtn>
              <Download className="w-4 h-4" />
              Export inventaire
            </MagBtn>
            <MagBtn>
              <Download className="w-4 h-4" />
              Export mouvements
            </MagBtn>
          </div>
        </div>
      </MagCardFlat>
    </MagPage>
  );
}
