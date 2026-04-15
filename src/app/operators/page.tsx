"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useOperators } from "@/hooks/useData";
import { insertOperator } from "@/lib/data-provider";
import type { Operator } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  Users,
  Plus,
  UserCheck,
  Droplets,
  Calendar,
  ChevronRight,
  Shield,
  Wrench,
  Leaf,
  Search,
  X,
  Loader2,
  Phone,
  BadgeCheck,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  operator: "Opérateur",
  technician: "Technicien",
  agronomist: "Agronome",
};

const roleIcons: Record<string, typeof Wrench> = {
  operator: Users,
  technician: Wrench,
  agronomist: Leaf,
};

const avatarColors = [
  { bg: "bg-amber-500/15", border: "border-amber-500/25", text: "text-amber-400" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/25", text: "text-cyan-400" },
  { bg: "bg-violet-500/15", border: "border-violet-500/25", text: "text-violet-400" },
  { bg: "bg-green-500/15", border: "border-green-500/25", text: "text-green-400" },
  { bg: "bg-rose-500/15", border: "border-rose-500/25", text: "text-rose-400" },
  { bg: "bg-blue-500/15", border: "border-blue-500/25", text: "text-blue-400" },
];

export default function OperatorsPage() {
  const { data: operatorsRaw, loading, refetch } = useOperators();
  const operators = (operatorsRaw || []) as Operator[];

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOp, setNewOp] = useState({ name: "", role: "operator", phone: "", cert: "" });

  if (loading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  const activeOperators = operators.filter((o) => o.active);
  const totalTreatments = operators.reduce((a, o) => a + o.totalTreatments, 0);

  const filtered = operators.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.fullName.toLowerCase().includes(q) || o.identifierCode.toLowerCase().includes(q) || o.role.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="mb-8 bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Opérateurs</h1>
            <p className="text-sm text-white/60 mt-1">
              {operators.length} opérateurs · {activeOperators.length} actifs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="glass-input pl-9 pr-4 py-2 text-sm w-52"
              />
            </div>
            <button onClick={() => setAddOpen(true)} className="glass-button px-4 py-2.5 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Ajouter un opérateur
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-500/25 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white/90">{activeOperators.length}</span>
            <p className="text-xs text-white/40">Opérateurs actifs</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white/90">{totalTreatments}</span>
            <p className="text-xs text-white/40">Traitements totaux</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Shield className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white/90">{operators.filter(o => o.role === "technician").length}</span>
            <p className="text-xs text-white/40">Techniciens</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-2 glass-card p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/10 to-amber-500/10 border border-white/10 flex items-center justify-center mb-5">
              <Users className="w-10 h-10 text-white/35" />
            </div>
            <h3 className="text-base font-semibold text-white/60 mb-2">Aucun opérateur trouvé</h3>
            <p className="text-sm text-white/50 max-w-xs mb-6">
              {search ? "Essayez avec un autre terme de recherche." : "Ajoutez votre premier opérateur pour commencer à suivre les traitements et les interventions."}
            </p>
            {!search && (
              <button className="glass-button px-5 py-2.5 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Ajouter un opérateur
              </button>
            )}
          </div>
        )}
        {filtered.map((op, idx) => {
          const RoleIcon = roleIcons[op.role] || Users;
          const color = op.active ? avatarColors[idx % avatarColors.length] : { bg: "bg-white/[0.06]", border: "border-white/[0.1]", text: "text-white/40" };
          return (
            <div key={op.id} className="glass-card p-5 group cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl border flex items-center justify-center text-lg font-bold",
                    color.bg, color.border, color.text
                  )}>
                    {op.fullName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/85">{op.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/40 font-mono">{op.identifierCode}</span>
                      <span className={cn(
                        "badge text-[10px]",
                        op.role === "technician" ? "badge-info" :
                        op.role === "agronomist" ? "badge-info" : "badge-neutral"
                      )}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {roleLabels[op.role]}
                      </span>
                      <span className={cn(
                        "badge text-[10px]",
                        op.active ? "badge-success" : "badge-danger"
                      )}>
                        {op.active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/35 group-hover:text-white/40 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-white/40">
                    <span className="font-mono text-white/60">{op.totalTreatments}</span> traitements
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-xs text-white/40">
                    {op.lastTreatmentDate
                      ? new Date(op.lastTreatmentDate).toLocaleDateString("fr-FR")
                      : "Aucun traitement"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-8" />

      {/* ═══ ADD OPERATOR MODAL ═══ */}
      {addOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white/90">Nouvel opérateur</h3>
              <button onClick={() => setAddOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1">Nom complet *</label>
                <input
                  value={newOp.name}
                  onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
                  placeholder="Ex: Ahmed Benali"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/90 focus:border-amber-500/40 focus:outline-none placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1">Rôle *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["operator", "technician", "agronomist"] as const).map((r) => {
                    const Icon = roleIcons[r] || Users;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewOp({ ...newOp, role: r })}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                          newOp.role === r
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                            : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:bg-white/[0.06]"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">{roleLabels[r]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />Téléphone
                  </label>
                  <input
                    value={newOp.phone}
                    onChange={(e) => setNewOp({ ...newOp, phone: e.target.value })}
                    placeholder="0555 00 00 00"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/90 focus:border-amber-500/40 focus:outline-none placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1">
                    <BadgeCheck className="w-3 h-3 inline mr-1" />N° Certification
                  </label>
                  <input
                    value={newOp.cert}
                    onChange={(e) => setNewOp({ ...newOp, cert: e.target.value })}
                    placeholder="CERT-XXXX"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/90 focus:border-amber-500/40 focus:outline-none placeholder:text-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.06] transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={saving || !newOp.name.trim()}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await insertOperator({
                      name: newOp.name.trim(),
                      role: newOp.role,
                      phone: newOp.phone.trim() || undefined,
                      certificationNumber: newOp.cert.trim() || undefined,
                    });
                    await refetch();
                    setAddOpen(false);
                    setNewOp({ name: "", role: "operator", phone: "", cert: "" });
                  } catch (err) {
                    alert((err as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
