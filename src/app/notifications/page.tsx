"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { 
  BellRing, Plus, Loader2, ToggleLeft, ToggleRight, Trash2, Send, CheckCircle2, AlertOctagon, Mail, ShieldAlert
} from "lucide-react";
import { supabase as rawSupabase } from "@/lib/supabase/client";
const supabase = rawSupabase as any;

interface AlertRoute {
  id: number;
  event_type: string;
  role_cible: string;
  canal: "PUSH" | "WHATSAPP" | "EMAIL" | "SMS";
  priorite: number;
  actif: boolean;
}

interface AlerteLog {
  identifiant_alerte: number;
  message_alerte: string;
  canal_notification: string;
  statut_alerte: string;
  date_envoi: string;
}

const EVENT_TYPES = [
  "DETECTION_MALADIE_CONFIRMEE",
  "DETECTION_CRITIQUE",
  "RUPTURE_STOCK",
  "DLC_PRODUIT_PROCHE",
  "METEO_BLOQUE_PLAN",
  "CAPTEUR_SILENCIEUX",
  "PLAN_VALIDE"
];

const ROLES = ["ADMIN", "AGRONOME", "CONSULTANT", "MAGASINIER", "OPERATEUR"];
const CHANNELS: AlertRoute["canal"][] = ["PUSH", "WHATSAPP", "EMAIL", "SMS"];

export default function NotificationsPage() {
  const [routes, setRoutes] = useState<AlertRoute[]>([]);
  const [logs, setLogs] = useState<AlerteLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Rule insertion state
  const [newRule, setNewRule] = useState({
    event_type: EVENT_TYPES[0],
    role_cible: ROLES[1], // AGRONOME
    canal: CHANNELS[0],
    priorite: 2,
  });

  // Test panel state
  const [testPayload, setTestPayload] = useState({
    eventType: EVENT_TYPES[0],
    message: "Alerte de test générée depuis la console d'administration LeadFarm.",
  });
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Load alert routing & alerte logs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: routingData } = await supabase
        .from("alert_routing")
        .select("*")
        .order("created_at", { ascending: false });
      setRoutes(routingData || []);

      const { data: logsData } = await supabase
        .from("ALERTE")
        .select("*")
        .order("date_envoi", { ascending: false })
        .limit(20);
      setLogs(logsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle active status
  const handleToggleActif = async (routeId: number, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from("alert_routing")
        .update({ actif: !currentVal })
        .eq("id", routeId);

      if (error) throw error;
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, actif: !currentVal } : r));
    } catch (err) {
      setRouteError("Erreur lors du changement de statut");
    }
  };

  // Change priority
  const handleChangePriority = async (routeId: number, priority: number) => {
    try {
      const { error } = await supabase
        .from("alert_routing")
        .update({ priorite: priority })
        .eq("id", routeId);

      if (error) throw error;
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, priorite: priority } : r));
    } catch (err) {
      setRouteError("Erreur lors de la mise à jour de la priorité");
    }
  };

  // Delete routing rule
  const handleDeleteRule = async (routeId: number) => {
    try {
      const { error } = await supabase
        .from("alert_routing")
        .delete()
        .eq("id", routeId);

      if (error) throw error;
      setRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch (err) {
      setRouteError("Erreur lors de la suppression de la règle");
    }
  };

  // Create new alert route
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("alert_routing")
        .insert({
          id_tenant: 1, // Domain Khelifa
          event_type: newRule.event_type,
          role_cible: newRule.role_cible,
          canal: newRule.canal,
          priorite: newRule.priorite,
          actif: true
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setRoutes(prev => [data, ...prev]);
      }
    } catch (err) {
      setRouteError("La règle existe déjà ou une contrainte SQL a échoué.");
    }
  };

  // Dispatch test alert
  const handleFireTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestStatus(null);

    try {
      const res = await fetch("/api/v1/alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-token": "internal_secret_service_token" // Default fallback token
        },
        body: JSON.stringify({
          eventType: testPayload.eventType,
          tenantId: 1,
          message: testPayload.message
        })
      });

      if (res.ok) {
        setTestStatus("Alerte de test envoyée avec succès!");
        loadData(); // reload log history
      } else {
        const err = await res.json();
        setTestStatus(`Erreur de dispatch: ${err.error || res.statusText}`);
      }
    } catch (err) {
      setTestStatus("Failed to contact API.");
    } finally {
      setTesting(false);
    }
  };

  const getLogStatusBadge = (status: string) => {
    switch (status) {
      case "envoyee": return "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20 text-[10px] px-1.5 py-0.5 rounded border font-medium";
      case "erreur": return "bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5 py-0.5 rounded border font-medium";
      default: return "bg-gray-100 text-gray-400 border-gray-200 text-[10px] px-1.5 py-0.5 rounded border font-medium";
    }
  };

  const activeRoutesCount = routes.filter(r => r.actif).length;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#f5f5f7] p-6 text-gray-900 font-sans">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/15 flex items-center justify-center border border-[#0071e3]/25">
            <BellRing className="w-6 h-6 text-[#0071e3]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800">Notification Engine</h1>
            <p className="text-xs text-gray-500">
              {activeRoutesCount} règles de routage actives — configurez la transmission automatique d'alertes par WhatsApp, Push ou Email.
            </p>
          </div>
        </div>

        {/* Primary Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns (Section 1: Routing Matrix) (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Alert Routing Matrix card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Matrice de routage d'alertes</h2>
              {routeError && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
                  <span>{routeError}</span>
                  <button onClick={() => setRouteError(null)} className="text-red-400 hover:text-red-600 shrink-0">✕</button>
                </div>
              )}
              
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
                  <span className="text-xs text-gray-400">Chargement de la matrice...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-gray-600">
                    <thead>
                      <tr className="bg-[#f5f5f7] border-b border-gray-100 text-left text-gray-400">
                        <th className="p-2.5 font-semibold">Type Evénement</th>
                        <th className="p-2.5 font-semibold">Rôle Cible</th>
                        <th className="p-2.5 font-semibold">Canal</th>
                        <th className="p-2.5 font-semibold">Priorité</th>
                        <th className="p-2.5 font-semibold text-center">Statut</th>
                        <th className="p-2.5 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="p-2.5 font-bold text-gray-700 font-mono text-[10px]">{r.event_type}</td>
                          <td className="p-2.5 font-medium">{r.role_cible}</td>
                          <td className="p-2.5 font-medium flex items-center gap-1 text-[11px] text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            {r.canal}
                          </td>
                          <td className="p-2.5">
                            <select
                              value={r.priorite}
                              onChange={e => handleChangePriority(r.id, parseInt(e.target.value))}
                              className="bg-[#f5f5f7] border-none text-[11px] font-bold rounded-lg py-1 px-1.5 focus:outline-none"
                            >
                              <option value="1">1 (Critique)</option>
                              <option value="2">2 (Elevée)</option>
                              <option value="3">3 (Basse)</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleToggleActif(r.id, r.actif)}
                              className="text-[#0071e3] transition-all inline-flex items-center cursor-pointer"
                            >
                              {r.actif ? (
                                <ToggleRight className="w-6 h-6 text-[#34c759]" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-300" />
                              )}
                            </button>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleDeleteRule(r.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {routes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-8 text-gray-400">Aucune règle configurée.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Inline creation rule form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1">
                <Plus className="w-4 h-4 text-[#0071e3]" /> Ajouter une règle de routage
              </h2>
              
              <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Type d'Evénement</label>
                  <select
                    value={newRule.event_type}
                    onChange={e => setNewRule(prev => ({ ...prev, event_type: e.target.value }))}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                  >
                    {EVENT_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Rôle Cible</label>
                  <select
                    value={newRule.role_cible}
                    onChange={e => setNewRule(prev => ({ ...prev, role_cible: e.target.value }))}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Canal</label>
                  <select
                    value={newRule.canal}
                    onChange={e => setNewRule(prev => ({ ...prev, canal: e.target.value as any }))}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                  >
                    {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                </div>

                <button
                  type="submit"
                  className="py-2.5 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer text-center"
                >
                  Enregistrer la Règle
                </button>
              </form>
            </div>

          </div>

          {/* Right Column (Section 2 & 3: Recent Logs & Test Panel) (1/3 width) */}
          <div className="flex flex-col gap-6">
            
            {/* Test Panel (Admin only) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#7424b5]" /> Console de Test
              </h2>

              <form onSubmit={handleFireTestAlert} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Type d'Evénement</label>
                  <select
                    value={testPayload.eventType}
                    onChange={e => setTestPayload(prev => ({ ...prev, eventType: e.target.value as any }))}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                  >
                    {EVENT_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Message Alerte</label>
                  <textarea
                    value={testPayload.message}
                    onChange={e => setTestPayload(prev => ({ ...prev, message: e.target.value }))}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                    rows={2}
                  />
                </div>

                {testStatus && (
                  <div className={`p-2 rounded-lg text-[11px] font-semibold border ${
                    testStatus.startsWith("Alerte") 
                      ? "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20" 
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}>
                    {testStatus}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={testing}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#7424b5] hover:bg-[#7424b5]/90 disabled:opacity-40 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer text-center"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Enclentcher l'Alerte
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Recent Notifications Logs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5 flex flex-col gap-4 flex-1">
              <h2 className="text-sm font-bold text-gray-800">Journal des transmissions</h2>
              
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                {logs.map(log => (
                  <div key={log.identifiant_alerte} className="p-3 bg-[#f5f5f7] border border-gray-150 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-400 font-bold font-mono">
                        #{log.identifiant_alerte}
                      </span>
                      {getLogStatusBadge(log.statut_alerte)}
                    </div>
                    <p className="text-[11px] font-medium text-gray-700 leading-tight">
                      {log.message_alerte}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1 border-t border-gray-200/40 pt-1.5 font-mono">
                      <span>Canaux: <strong className="text-gray-500">{log.canal_notification}</strong></span>
                      <span>{new Date(log.date_envoi).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}

                {logs.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-12">Aucun log récent d'alerte.</p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
