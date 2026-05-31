"use client";

import { useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { PageScreen, PageHero, AdalineButton } from "@/components/adaline/PageScreen";
import InlineBanner from "@/components/ui/InlineBanner";
import FeatureGate from "@/components/auth/FeatureGate";
import { DEMO_IDS } from "@/lib/demo-simulation";
import {
  Play,
  Loader2,
  MapPin,
  Sprout,
  CalendarDays,
  FlaskConical,
  Droplets,
  Bell,
  GitBranch,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StepResult = {
  key: string;
  label: string;
  status: "ok" | "error";
  detail?: string;
  href?: string;
};

const FLOW = [
  { icon: MapPin, label: "Parcelle", desc: "Zone cartographiée (regions + miroir MCD)", href: "/parcelles" },
  { icon: CalendarDays, label: "Campagne", desc: "Saison agricole active", href: "/campagnes" },
  { icon: Sprout, label: "Plantation", desc: "Culture & variété sur la parcelle", href: "/campagnes" },
  { icon: FlaskConical, label: "Produit", desc: "Phyto en stock (CONFIDOR)", href: "/products" },
  { icon: Droplets, label: "Traitement", desc: "Ordre exécuté + produits appliqués", href: `/treatments?id=${DEMO_IDS.treatment}` },
  { icon: Bell, label: "Alerte", desc: "Notification post-traitement", href: "/alerts" },
  { icon: GitBranch, label: "Traçabilité", desc: "Fil complet parcelle → produit", href: `/trace/${DEMO_IDS.treatment}` },
];

export default function SimulationPage() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function runSimulation() {
    setRunning(true);
    setError(null);
    setSuccess(false);
    setSteps(null);
    try {
      const res = await fetch("/api/v1/simulation/run", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Échec de la simulation");
        setSteps(json.steps || null);
        return;
      }
      setSteps(json.steps || []);
      setSuccess(true);
    } catch {
      setError("Impossible de joindre l'API — vérifiez Supabase et la connexion.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppLayout>
      <PageScreen>
        <PageHero
          eyebrow="PILOTAGE · DÉMO"
          title="Simulation bout en bout"
          faded="Une opération : parcelle → plantation → produit → traitement → alerte → traçabilité."
          actions={
            <FeatureGate
              feature="simulation"
              fallback={
                <span className="text-sm text-[var(--color-mist-gray)]">
                  Réservé aux profils directeur et responsable technique.
                </span>
              }
            >
              <AdalineButton
                variant="primary"
                onClick={runSimulation}
                className={running ? "pointer-events-none opacity-70" : ""}
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {running ? "Injection…" : "Lancer la simulation Supabase"}
              </AdalineButton>
            </FeatureGate>
          }
        />

        {error && (
          <InlineBanner tone="error" onDismiss={() => setError(null)}>
            {error}
            <span className="block text-xs mt-1 opacity-90">
              Prérequis : migrations 007, 014, 016 appliquées +{" "}
              <code className="text-[10px]">SUPABASE_SERVICE_ROLE_KEY</code> dans .env.local
            </span>
          </InlineBanner>
        )}

        {success && (
          <InlineBanner tone="success">
            Chaîne démo injectée. Parcourez les modules via les liens ci-dessous.
          </InlineBanner>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="dash-card">
            <h3 className="dash-card-title mb-4">Chaîne métier</h3>
            <ol className="space-y-3">
              {FLOW.map((item, i) => {
                const Icon = item.icon;
                const step = steps?.find((s) =>
                  s.label.toLowerCase().includes(item.label.toLowerCase().slice(0, 4))
                );
                return (
                  <li key={item.label} className="flex gap-3 items-start">
                    <span className="mono text-[10px] text-[var(--color-mist-gray)] w-5 pt-2">
                      {i + 1}
                    </span>
                    <div
                      className={cn(
                        "flex-1 flex items-center gap-3 p-3 rounded-xl border transition-colors",
                        step?.status === "ok"
                          ? "border-[var(--color-valley-green)]/30 bg-[var(--color-forest-dew)]"
                          : "border-[var(--color-stone-moss)] bg-[var(--color-canvas-ice)]"
                      )}
                    >
                      <Icon className="w-4 h-4 text-[var(--color-valley-green)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-adaline-ink)]">
                          {item.label}
                        </p>
                        <p className="text-xs text-[var(--color-mist-gray)]">{item.desc}</p>
                      </div>
                      {step && (
                        step.status === "ok" ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-valley-green)] shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[var(--c-danger)] shrink-0" />
                        )
                      )}
                      <Link
                        href={item.href}
                        className="lf-btn lf-btn-tertiary !h-8 !px-2 shrink-0"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="dash-card">
              <h3 className="dash-card-title mb-3">Journal d&apos;exécution</h3>
              {!steps ? (
                <p className="text-sm text-[var(--color-mist-gray)]">
                  Cliquez sur « Lancer la simulation » pour créer ou mettre à jour les données
                  démo dans Supabase (IDs stables, ré-exécutable).
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {steps.map((s) => (
                    <li key={s.key} className="flex items-start gap-2">
                      {s.status === "ok" ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-valley-green)] mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[var(--c-danger)] mt-0.5 shrink-0" />
                      )}
                      <span>
                        <strong>{s.label}</strong>
                        {s.detail && (
                          <span className="block text-xs text-[var(--c-danger)]">{s.detail}</span>
                        )}
                        {s.href && s.status === "ok" && (
                          <Link href={s.href} className="text-xs text-[var(--color-valley-green)] underline">
                            Ouvrir
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dash-card">
              <h3 className="dash-card-title mb-3">Pages du parcours</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Tableau de bord", "/dashboard"],
                  ["Parcelles", "/parcelles"],
                  ["Campagnes", "/campagnes"],
                  ["Produits", "/products"],
                  ["Stock", "/stock"],
                  ["Traitements", "/treatments"],
                  ["Registre", "/registre"],
                  ["Alertes", "/alerts"],
                  ["Traçabilité", `/trace/${DEMO_IDS.treatment}`],
                  ["IoT Live", "/live"],
                  ["Satellite", "/satellite"],
                ].map(([label, href]) => (
                  <Link key={href} href={href} className="lf-btn lf-btn-tertiary text-xs !h-8">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--color-mist-gray)]">
              CLI : <code className="mono">node scripts/seed-demo-simulation.mjs</code>
            </p>
          </div>
        </div>
      </PageScreen>
    </AppLayout>
  );
}
