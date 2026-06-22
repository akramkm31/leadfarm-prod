"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { MagasinierPage } from "@/components/magasinier/MagasinierBranch";
import MagSettingsPage from "@/components/magasinier/pages/MagSettingsPage";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Settings,
  Building,
  Globe,
  Bell,
  Shield,
  Database,
  Wifi,
  CreditCard,
  ChevronRight,
  Save,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExploitationData {
  nom: string;
  n_enregistrement: string;
  wilaya: string;
  plan_abonnement: string;
}

interface UserPreferences {
  langue: string;
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_sms: boolean;
}

type ModalKey = "exploitation" | "langue" | "notifications" | "securite" | "donnees" | "connectivite" | "abonnement";

const sections = [
  { id: "exploitation" as ModalKey, title: "Exploitation", icon: Building, description: "Nom, adresse, num�ro d'enregistrement", color: "green" },
  { id: "langue" as ModalKey, title: "Langue & R�gion", icon: Globe, description: "Fran�ais, Arabe, fuseau horaire", color: "cyan" },
  { id: "notifications" as ModalKey, title: "Notifications", icon: Bell, description: "Seuils d'alerte, canaux de notification", color: "amber" },
  { id: "securite" as ModalKey, title: "S�curit�", icon: Shield, description: "Authentification, r�les, permissions", color: "violet" },
  { id: "donnees" as ModalKey, title: "Donn�es & Export", icon: Database, description: "Export CSV, sauvegarde, r�tention", color: "cyan" },
  { id: "connectivite" as ModalKey, title: "Connectivit�", icon: Wifi, description: "MQTT broker, intervalles de synchronisation", color: "green" },
  { id: "abonnement" as ModalKey, title: "Abonnement", icon: CreditCard, description: "Plan Pro — Expire le 31/12/2026", color: "amber" },
];

const colorStyles: Record<string, string> = {
  green: "bg-green-600/20 border-green-500/25 text-green-400",
  cyan: "bg-[var(--color-valley-green)]/15 border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)]",
  amber: "bg-[var(--color-valley-green)]/15 border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)]",
  violet: "bg-[var(--color-valley-green)]/15 border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)]",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <MagasinierPage mag={MagSettingsPage} />;
  }
  return <SettingsContent />;
}

function SettingsContent() {
  const [user, setUser] = useState<any>(null);
  const [exploitation, setExploitation] = useState<ExploitationData>({
    nom: "Domaine Khelifa",
    n_enregistrement: "DSA-2024-00124",
    wilaya: "Biskra",
    plan_abonnement: "Pro",
  });
  const [prefs, setPrefs] = useState<UserPreferences>({
    langue: "fr",
    notifications_email: true,
    notifications_push: true,
    notifications_sms: false,
  });
  const [modalOpen, setModalOpen] = useState<ModalKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Charger les donn�es utilisateur et exploitation
  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) setUser(u);

      // Exploitation
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("exploitation_id")
        .eq("id", u?.id)
        .single();
      if (profile?.exploitation_id) {
        const { data: explo } = await supabase
          .from("exploitations")
          .select("*")
          .eq("id", profile.exploitation_id)
          .single();
        if (explo) {
          setExploitation({
            nom: explo.nom || "Domaine Khelifa",
            n_enregistrement: explo.n_enregistrement || "DSA-2024-00124",
            wilaya: explo.wilaya || "Biskra",
            plan_abonnement: explo.plan_abonnement || "Pro",
          });
        }
      }

      // Pr�f�rences
      if (u) {
        const { data: up } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", u.id)
          .single();
        if (up) {
          setPrefs({
            langue: up.langue || "fr",
            notifications_email: up.notifications_email ?? true,
            notifications_push: up.notifications_push ?? true,
            notifications_sms: up.notifications_sms ?? false,
          });
        }
      }
    }
    load();
  }, []);

  function showToastMsg(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveExploitation(data: Partial<ExploitationData>) {
    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("exploitation_id")
        .eq("id", user?.id)
        .single();
      if (profile?.exploitation_id) {
        await supabase.from("exploitations").update(data).eq("id", profile.exploitation_id);
      }
      setExploitation((prev) => ({ ...prev, ...data }));
      showToastMsg(true, "Exploitation sauvegard�e ✓");
      setModalOpen(null);
    } catch (err) {
      showToastMsg(false, "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences(prefsData: Partial<UserPreferences>) {
    setSaving(true);
    try {
      if (user) {
        await supabase.from("user_preferences").upsert({
          user_id: user.id,
          ...prefs,
          ...prefsData,
          updated_at: new Date().toISOString(),
        });
      }
      setPrefs((prev) => ({ ...prev, ...prefsData }));
      showToastMsg(true, "Pr�f�rences sauvegard�es ✓");
      setModalOpen(null);
    } catch (err) {
      showToastMsg(false, "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[60] max-w-md animate-in slide-in-from-top-2 p-4 rounded-xl  border shadow-2xl flex items-center gap-3",
          toast.ok
            ? "bg-[var(--color-valley-green)]/15 border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)]"
            : "bg-[var(--color-valley-green)]/15 border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)]"
        )}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
          <span className="flex-1 text-sm">{toast.msg}</span>
        </div>
      )}

      <div className="lf-page-header mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight">Param�tres</h1>
        <p className="text-sm text-[var(--color-adaline-ink)]/60 mt-1">
          Configuration de l&apos;exploitation — {exploitation.nom}
        </p>
      </div>

      {/* Exploitation info card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/25 to-green-600/20 border border-[var(--color-valley-green)]/30 flex items-center justify-center">
            <Building className="w-7 h-7 text-[var(--color-valley-green)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/85">{exploitation.nom}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[var(--color-adaline-ink)]/40 font-mono">{exploitation.n_enregistrement}</span>
              <span className="text-xs text-[var(--color-adaline-ink)]/30">|</span>
              <span className="text-xs text-[var(--color-adaline-ink)]/40">{exploitation.wilaya}</span>
              <span className="badge badge-success text-[10px]">{exploitation.plan_abonnement}</span>
            </div>
          </div>
          <button
            onClick={() => setModalOpen("exploitation")}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-[var(--color-adaline-ink)]/60 hover:text-[var(--color-adaline-ink)]/80 hover:bg-white/[0.1] transition-all"
          >
            Modifier
          </button>
        </div>
      </div>

      {/* Settings sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.id}
            onClick={() => setModalOpen(section.id)}
            className="glass-card p-5 group cursor-pointer hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", colorStyles[section.color])}>
                  <section.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">{section.title}</h3>
                  <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">{section.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-adaline-ink)]/20 group-hover:text-[var(--color-adaline-ink)]/40 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL : Exploitation ── */}
      {modalOpen === "exploitation" && (
        <SettingsModal title="Exploitation" onClose={() => setModalOpen(null)} saving={saving}>
          <input
            type="text"
            className="glass-input px-3 py-2 text-sm w-full mb-3"
            placeholder="Nom de l'exploitation"
            defaultValue={exploitation.nom}
            id="expl_nom"
          />
          <input
            type="text"
            className="glass-input px-3 py-2 text-sm w-full mb-3"
            placeholder="N° d'enregistrement"
            defaultValue={exploitation.n_enregistrement}
            id="expl_enreg"
          />
          <input
            type="text"
            className="glass-input px-3 py-2 text-sm w-full mb-3"
            placeholder="Wilaya"
            defaultValue={exploitation.wilaya}
            id="expl_wilaya"
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Annuler</button>
            <button
              onClick={() => saveExploitation({
                nom: (document.getElementById("expl_nom") as HTMLInputElement)?.value || exploitation.nom,
                n_enregistrement: (document.getElementById("expl_enreg") as HTMLInputElement)?.value || exploitation.n_enregistrement,
                wilaya: (document.getElementById("expl_wilaya") as HTMLInputElement)?.value || exploitation.wilaya,
              })}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold hover:bg-green-500/30 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </SettingsModal>
      )}

      {/* ── MODAL : Langue ── */}
      {modalOpen === "langue" && (
        <SettingsModal title="Langue & R�gion" onClose={() => setModalOpen(null)} saving={saving}>
          <label className="text-xs text-[var(--color-adaline-ink)]/50 block mb-1.5">Langue</label>
          <select
            className="glass-input px-3 py-2 text-sm w-full mb-4"
            defaultValue={prefs.langue}
            id="lang_select"
          >
            <option value="fr">Fran�ais</option>
            <option value="ar">العربية (Arabe)</option>
            <option value="en">English</option>
          </select>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Annuler</button>
            <button
              onClick={() => savePreferences({
                langue: (document.getElementById("lang_select") as HTMLSelectElement)?.value || "fr",
              })}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </SettingsModal>
      )}

      {/* ── MODAL : Notifications ── */}
      {modalOpen === "notifications" && (
        <SettingsModal title="Notifications" onClose={() => setModalOpen(null)} saving={saving}>
          <div className="space-y-3 mb-4">
            {[
              { id: "notif_email", label: "Notifications par email", key: "notifications_email", default: prefs.notifications_email },
              { id: "notif_push", label: "Notifications push (navigateur)", key: "notifications_push", default: prefs.notifications_push },
              { id: "notif_sms", label: "Notifications SMS", key: "notifications_sms", default: prefs.notifications_sms },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] cursor-pointer">
                <input
                  type="checkbox"
                  id={item.id}
                  defaultChecked={item.default}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span className="text-sm text-[var(--color-adaline-ink)]/70">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Annuler</button>
            <button
              onClick={() => savePreferences({
                notifications_email: (document.getElementById("notif_email") as HTMLInputElement)?.checked ?? true,
                notifications_push: (document.getElementById("notif_push") as HTMLInputElement)?.checked ?? true,
                notifications_sms: (document.getElementById("notif_sms") as HTMLInputElement)?.checked ?? false,
              })}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </SettingsModal>
      )}

      {/* ── MODAL : S�curit� ── */}
      {modalOpen === "securite" && (
        <SettingsModal title="S�curit�" onClose={() => setModalOpen(null)} saving={saving}>
          <p className="text-sm text-[var(--color-adaline-ink)]/50 mb-4">Les param�tres de s�curit� sont g�r�s depuis la console Supabase Auth.</p>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Fermer</button>
          </div>
        </SettingsModal>
      )}

      {/* ── MODAL : Donn�es ── */}
      {modalOpen === "donnees" && (
        <SettingsModal title="Donn�es & Export" onClose={() => setModalOpen(null)} saving={saving}>
          <p className="text-sm text-[var(--color-adaline-ink)]/50 mb-4">Exporter toutes les donn�es au format CSV depuis les sections respectives.</p>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Fermer</button>
          </div>
        </SettingsModal>
      )}

      {/* ── MODAL : Connectivit� ── */}
      {modalOpen === "connectivite" && (
        <SettingsModal title="Connectivit�" onClose={() => setModalOpen(null)} saving={saving}>
          <p className="text-sm text-[var(--color-adaline-ink)]/50 mb-4">Configuration MQTT et intervalles de synchronisation (� venir).</p>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Fermer</button>
          </div>
        </SettingsModal>
      )}

      {/* ── MODAL : Abonnement ── */}
      {modalOpen === "abonnement" && (
        <SettingsModal title="Abonnement" onClose={() => setModalOpen(null)} saving={saving}>
          <p className="text-sm text-[var(--color-adaline-ink)]/50 mb-4">
            Plan actuel : <strong className="text-[var(--color-valley-green)]">{exploitation.plan_abonnement}</strong>
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70">Fermer</button>
          </div>
        </SettingsModal>
      )}

      <div className="h-8" />
    </AppLayout>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({
  title,
  children,
  onClose,
  saving,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 " onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95  rounded-2xl shadow-xl border border-white/[0.15] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-adaline-ink)]/85">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[var(--color-adaline-ink)]/40">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
