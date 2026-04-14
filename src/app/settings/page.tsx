"use client";

import AppLayout from "@/components/layout/AppLayout";
import { currentExploitation } from "@/lib/mock-data";
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
} from "lucide-react";

const sections = [
  {
    title: "Exploitation",
    icon: Building,
    description: "Nom, adresse, numéro d'enregistrement",
    color: "green",
  },
  {
    title: "Langue & Région",
    icon: Globe,
    description: "Français, Arabe, fuseau horaire",
    color: "cyan",
  },
  {
    title: "Notifications",
    icon: Bell,
    description: "Seuils d'alerte, canaux de notification",
    color: "amber",
  },
  {
    title: "Sécurité",
    icon: Shield,
    description: "Authentification, rôles, permissions",
    color: "violet",
  },
  {
    title: "Données & Export",
    icon: Database,
    description: "Export CSV, sauvegarde, rétention",
    color: "cyan",
  },
  {
    title: "Connectivité",
    icon: Wifi,
    description: "MQTT broker, intervalles de synchronisation",
    color: "green",
  },
  {
    title: "Abonnement",
    icon: CreditCard,
    description: "Plan Pro · Expire le 31/12/2026",
    color: "amber",
  },
];

const colorStyles: Record<string, string> = {
  green: "bg-green-600/20 border-green-500/25 text-green-400",
  cyan: "bg-cyan-500/15 border-cyan-500/25 text-cyan-400",
  amber: "bg-amber-500/15 border-amber-500/25 text-amber-400",
  violet: "bg-violet-500/15 border-violet-500/25 text-violet-400",
};

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="mb-8 bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-tight">Paramètres</h1>
        <p className="text-sm text-white/60 mt-1">
          Configuration de l&apos;exploitation — {currentExploitation.name}
        </p>
      </div>

      {/* Exploitation info card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/25 to-green-600/20 border border-amber-500/30 flex items-center justify-center">
            <Building className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white/85">{currentExploitation.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-white/40 font-mono">{currentExploitation.registrationNumber}</span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs text-white/40">{currentExploitation.wilaya}</span>
              <span className="badge badge-success text-[10px]">{currentExploitation.subscriptionPlan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="glass-card p-5 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center",
                  colorStyles[section.color]
                )}>
                  <section.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/85">{section.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{section.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-8" />
    </AppLayout>
  );
}
