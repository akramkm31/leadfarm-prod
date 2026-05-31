"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { 
  CalendarDays, Plus, Loader2, Check, AlertTriangle, CloudRain, ShieldCheck, RefreshCw, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PlanConsultant {
  id: number;
  id_tenant: number;
  id_consultant: number;
  type_plan: "ANNUEL" | "TRIMESTRIEL";
  type_culture: string;
  variete: string;
  statut: "draft" | "submitted" | "validated" | "archived";
  annee: number;
  trimestre?: number;
  date_debut: string;
  date_fin: string;
  protocoles_json: any;
  notes?: string;
  validated_at?: string;
  validated_by?: number;
}

interface PlanningOperationnel {
  id: number;
  id_plan?: number;
  id_agronome: number;
  id_parcelle: number;
  id_campagne?: number;
  date_prevue: string;
  type_intervention: string;
  produits_requis: any[];
  operateurs_assignes: number[];
  meteo_valide?: boolean | null;
  meteo_data?: any;
  stock_valide?: boolean | null;
  stock_manquant?: any[];
  statut: "planifie" | "en_cours" | "termine" | "annule" | "reporte";
  motif_report?: string;
  date_reelle?: string;
}

interface Parcelle {
  identifiant_parcelle: number;
  nom_parcelle: string;
  superficie_hectares: number;
}

export default function PlanningPage() {
  const [plans, setPlans] = useState<PlanConsultant[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanConsultant | null>(null);
  const [plannings, setPlannings] = useState<PlanningOperationnel[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [cultureFilter, setCultureFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [anneeFilter, setAnneeFilter] = useState("all");

  // Selection states
  const [selectedPlanning, setSelectedPlanning] = useState<PlanningOperationnel | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Meteo & Stock Check UI states
  const [checkingMeteo, setCheckingMeteo] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [meteoResult, setMeteoResult] = useState<any>(null);
  const [stockResult, setStockResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  // New Plan modal state
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    type_plan: "ANNUEL" as "ANNUEL" | "TRIMESTRIEL",
    type_culture: "Olivier",
    variete: "*",
    annee: 2026,
    trimestre: 1,
    date_debut: "2026-01-01",
    date_fin: "2026-12-31",
    notes: "",
  });

  // Calendar month navigation
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 15)); // Default around May 2026

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch plans
      const { data: plansData } = await (supabase as any)
        .from("plan_consultant")
        .select("*")
        .order("annee", { ascending: false });
      setPlans(plansData || []);

      // Fetch parcelles
      const { data: parcellesData } = await (supabase as any)
        .from("PARCELLE")
        .select("identifiant_parcelle, nom_parcelle, superficie_hectares");
      setParcelles(parcellesData || []);

      // Select first plan by default
      if (plansData && plansData.length > 0 && !selectedPlan) {
        setSelectedPlan(plansData[0]);
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  // Load plannings for selected plan
  useEffect(() => {
    async function loadPlannings() {
      if (!selectedPlan) {
        setPlannings([]);
        return;
      }
      const { data } = await (supabase as any)
        .from("planning_operationnel")
        .select("*")
        .eq("id_plan", selectedPlan.id)
        .order("date_prevue", { ascending: true });
      setPlannings(data || []);
    }
    loadPlannings();
  }, [selectedPlan]);

  useEffect(() => {
    loadData();
  }, []);

  // Filter plans
  const filteredPlans = plans.filter(p => {
    if (cultureFilter !== "all" && p.type_culture !== cultureFilter) return false;
    if (statusFilter !== "all" && p.statut !== statusFilter) return false;
    if (anneeFilter !== "all" && p.annee !== parseInt(anneeFilter)) return false;
    return true;
  });

  // Unique filters for select dropdowns
  const uniqueCultures = [...new Set(plans.map(p => p.type_culture))];
  const uniqueAnnees = [...new Set(plans.map(p => p.annee))];

  // Calendar cell layout calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const cells: Date[] = [];
  // Fill leading days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, prevMonthDays - i));
  }
  // Fill current days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }
  // Fill trailing days
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month + 1, i));
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 15));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 15));

  // Handle plan submit
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPlan,
          protocoles_json: []
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setIsNewPlanOpen(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating plan");
    }
  };

  // Validate Plan
  const handleValidatePlan = async (planId: number) => {
    try {
      const res = await fetch(`/api/v1/plans/${planId}/validate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Update selected plan locally
      setSelectedPlan(data.plan);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Validation failed");
    }
  };

  // Select planning and load meteo/stock check
  const handleSelectPlanning = async (po: PlanningOperationnel) => {
    setSelectedPlanning(po);
    setMeteoResult(null);
    setStockResult(null);
    setValidationError(null);
    setValidationSuccess(null);
    setIsDetailOpen(true);

    // Call Meteo Check API
    setCheckingMeteo(true);
    try {
      const meteoRes = await fetch(`/api/v1/planning/meteo-check?date=${po.date_prevue}&lat=35.21&lng=-0.64&planning_id=${po.id}`);
      const meteoData = await meteoRes.json();
      setMeteoResult(meteoData);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingMeteo(false);
    }

    // Call Stock Check API
    setCheckingStock(true);
    try {
      const stockRes = await fetch(`/api/v1/planning/stock-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planning_id: po.id,
          date_prevue: po.date_prevue,
          produits_requis: po.produits_requis || []
        })
      });
      const stockData = await stockRes.json();
      setStockResult(stockData);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingStock(false);
    }
  };

  // Confirm planned intervention
  const handleValidateIntervention = async () => {
    if (!selectedPlanning) return;
    setValidationError(null);
    setValidationSuccess(null);

    try {
      const res = await fetch(`/api/v1/planning/${selectedPlanning.id}/validate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      
      if (!res.ok) {
        setValidationError(data.error || "Echec de lancement");
      } else {
        setValidationSuccess("Intervention lancée avec succès!");
        
        // Refresh local list
        setPlannings(prev => prev.map(p => p.id === selectedPlanning.id ? data.planning : p));
        setSelectedPlanning(data.planning);
      }
    } catch (err) {
      setValidationError("Failed to validate.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "validated": return "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30";
      case "submitted": return "bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30";
      case "archived": return "bg-gray-100 text-gray-500 border-gray-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getInterventionBadge = (status: string) => {
    switch (status) {
      case "en_cours": return "bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5 rounded border font-medium";
      case "termine": return "bg-[#34c759]/15 text-[#34c759] border-[#34c759]/30 text-[10px] px-1.5 py-0.5 rounded border font-medium";
      case "annule": return "bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5 py-0.5 rounded border font-medium";
      case "reporte": return "bg-orange-100 text-orange-700 border-orange-300 text-[10px] px-1.5 py-0.5 rounded border font-medium";
      default: return "bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20 text-[10px] px-1.5 py-0.5 rounded border font-medium";
    }
  };

  const frenchMonth = currentDate.toLocaleString("fr-FR", { month: "long", year: "numeric" });

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#f5f5f7] p-6 text-gray-900 font-sans">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7424b5]/15 flex items-center justify-center border border-[#7424b5]/25">
              <CalendarDays className="w-6 h-6 text-[#7424b5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-800">Planning Consultant</h1>
              <p className="text-xs text-gray-500">
                Gérez les plans agronomiques pluriannuels et validez les opérations d'intervention.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsNewPlanOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau Plan
          </button>
        </div>

        {/* Primary Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Left panel: PlanConsultantList (40%) */}
          <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">Plans Agronomiques</h2>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">LINEAGE C</span>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-2">
              <select
                value={cultureFilter}
                onChange={e => setCultureFilter(e.target.value)}
                className="bg-[#f5f5f7] border-none text-xs rounded-lg py-2 px-2 text-gray-600 focus:outline-none"
              >
                <option value="all">Culture</option>
                {uniqueCultures.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#f5f5f7] border-none text-xs rounded-lg py-2 px-2 text-gray-600 focus:outline-none"
              >
                <option value="all">Statut</option>
                <option value="draft">Brouillon</option>
                <option value="submitted">Soumis</option>
                <option value="validated">Validé</option>
                <option value="archived">Archivé</option>
              </select>

              <select
                value={anneeFilter}
                onChange={e => setAnneeFilter(e.target.value)}
                className="bg-[#f5f5f7] border-none text-xs rounded-lg py-2 px-2 text-gray-600 focus:outline-none"
              >
                <option value="all">Année</option>
                {uniqueAnnees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Plan List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
                <span className="text-xs text-gray-400">Chargement des plans...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                {filteredPlans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedPlan?.id === plan.id 
                        ? "border-[#0071e3] bg-[#0071e3]/5 shadow-sm" 
                        : "border-gray-100 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-800">
                        Plan {plan.type_plan} {plan.annee}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(plan.statut)}`}>
                        {plan.statut}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 mb-2">
                      <div>Culture: <span className="font-semibold text-gray-700">{plan.type_culture}</span></div>
                      <div>Variété: <span className="font-semibold text-gray-700">{plan.variete}</span></div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Intervalle: {plan.date_debut} au {plan.date_fin}
                    </div>

                    {plan.statut === "draft" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleValidatePlan(plan.id);
                        }}
                        className="mt-3 w-full text-center text-[10px] font-bold py-1.5 px-3 bg-[#34c759] text-white rounded-lg hover:bg-[#34c759]/90 transition-all cursor-pointer"
                      >
                        Valider et Publier le Plan
                      </button>
                    )}
                  </div>
                ))}

                {filteredPlans.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-12">Aucun plan ne correspond aux filtres.</p>
                )}
              </div>
            )}
          </div>

          {/* Right panel: PlanningCalendar (60%) */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5 flex flex-col">
            
            {/* Month selector */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800 capitalize">{frenchMonth}</h2>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid structure */}
            <div className="grid grid-cols-7 gap-1 flex-1 min-h-[450px]">
              {/* Day Labels */}
              {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1 select-none">
                  {d}
                </div>
              ))}

              {/* Day cells */}
              {cells.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === month;
                const dateStr = date.toISOString().split("T")[0];
                const dayPlannings = plannings.filter(p => p.date_prevue === dateStr);

                return (
                  <div
                    key={idx}
                    className={`min-h-[70px] p-1 border border-gray-50 rounded-lg flex flex-col gap-1 transition-all ${
                      isCurrentMonth ? "bg-white" : "bg-gray-50/50 opacity-40"
                    }`}
                  >
                    <span className={`text-[10px] font-bold self-end pr-1 ${
                      isCurrentMonth ? "text-gray-600" : "text-gray-400"
                    }`}>
                      {date.getDate()}
                    </span>

                    {/* Planning items */}
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[50px] scrollbar-none">
                      {dayPlannings.map(po => (
                        <div
                          key={po.id}
                          onClick={() => handleSelectPlanning(po)}
                          className="p-1 text-[9px] font-bold text-gray-700 bg-[#0071e3]/5 border border-[#0071e3]/10 hover:border-[#0071e3]/45 rounded flex flex-col cursor-pointer transition-all truncate"
                          title={`${po.type_intervention} - Parcelle #${po.id_parcelle}`}
                        >
                          <span className="truncate">{po.type_intervention}</span>
                          <span className="text-[8px] font-normal text-gray-400 truncate">Parcelle #{po.id_parcelle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Planning Detail Sheet Drawer */}
        {isDetailOpen && selectedPlanning && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
            <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto relative animate-in slide-in-from-right duration-200">
              
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-gray-100 pb-3">
                <span className="text-[10px] font-bold text-[#7424b5] uppercase bg-[#7424b5]/10 px-2 py-0.5 rounded-md border border-[#7424b5]/20">
                  Détail de l'intervention
                </span>
                <h3 className="text-base font-bold text-gray-800 mt-2 capitalize">{selectedPlanning.type_intervention}</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Prévu le : {selectedPlanning.date_prevue}</p>
              </div>

              {/* General details */}
              <div className="flex flex-col gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                <div className="flex justify-between">
                  <span className="text-gray-400">Statut:</span>
                  {getInterventionBadge(selectedPlanning.statut)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ID Parcelle:</span>
                  <span className="font-semibold text-gray-700">#{selectedPlanning.id_parcelle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Opérateurs Assignés:</span>
                  <span className="font-semibold text-gray-700">
                    {selectedPlanning.operateurs_assignes.length > 0 
                      ? selectedPlanning.operateurs_assignes.join(", ") 
                      : "Aucun"}
                  </span>
                </div>
              </div>

              {/* Meteo Check Component */}
              <div className="flex flex-col gap-2 bg-white border border-gray-200/70 p-4 rounded-xl shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-gray-700">Validation Météorologique</span>
                  </div>
                  {checkingMeteo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  ) : selectedPlanning.meteo_valide === true ? (
                    <span className="text-[10px] text-[#34c759] font-bold flex items-center gap-0.5 bg-[#34c759]/10 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Validé
                    </span>
                  ) : selectedPlanning.meteo_valide === false ? (
                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" /> Bloqué
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-medium">Non vérifié</span>
                  )}
                </div>

                {meteoResult && (
                  <div className="text-[11px] flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 text-gray-600 bg-[#f5f5f7] p-2.5 rounded-lg border border-gray-150">
                      <div>Temp max: <span className="font-semibold">{meteoResult.forecast?.temperature_max_c}°C</span></div>
                      <div>Vent max: <span className="font-semibold">{meteoResult.forecast?.wind_speed_max_kmh} km/h</span></div>
                      <div>Precip: <span className="font-semibold">{meteoResult.forecast?.precipitation_sum_mm} mm</span></div>
                      <div>Prob pluie: <span className="font-semibold">{meteoResult.forecast?.precipitation_probability_max}%</span></div>
                    </div>
                    {meteoResult.blockers?.length > 0 && (
                      <div className="flex flex-col gap-1 p-2 bg-red-50 border border-red-200/50 rounded-lg">
                        {meteoResult.blockers.map((b: string, i: number) => (
                          <div key={i} className="text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stock Check Component */}
              <div className="flex flex-col gap-2 bg-white border border-gray-200/70 p-4 rounded-xl shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-gray-700">Disponibilité du Stock</span>
                  </div>
                  {checkingStock ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                  ) : selectedPlanning.stock_valide === true ? (
                    <span className="text-[10px] text-[#34c759] font-bold flex items-center gap-0.5 bg-[#34c759]/10 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Disponible
                    </span>
                  ) : selectedPlanning.stock_valide === false ? (
                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" /> Manquant
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-medium">Non vérifié</span>
                  )}
                </div>

                {stockResult && (
                  <div className="text-[11px]">
                    {stockResult.valid ? (
                      <p className="text-[#34c759] font-medium bg-[#34c759]/10 p-2 rounded-lg text-center border border-[#34c759]/20">
                        Tous les produits sont réservés et disponibles en stock!
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <table className="w-full text-[10px] text-gray-600 border border-gray-100 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-left">
                              <th className="p-1.5">Produit</th>
                              <th className="p-1.5 text-right">Requis</th>
                              <th className="p-1.5 text-right">Dispo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockResult.manquant?.map((m: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-50">
                                <td className="p-1.5 font-bold text-gray-700">{m.produit}</td>
                                <td className="p-1.5 text-right font-medium text-red-600">{m.requis} {m.unite}</td>
                                <td className="p-1.5 text-right font-medium text-gray-500">{m.disponible} {m.unite}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status and Action validations */}
              <div className="mt-auto flex flex-col gap-2 border-t border-gray-100 pt-4">
                {validationError && (
                  <div className="bg-red-50 text-red-600 p-2.5 rounded-lg border border-red-200 text-xs font-semibold">
                    {validationError}
                  </div>
                )}
                
                {validationSuccess && (
                  <div className="bg-[#34c759]/10 text-[#34c759] p-2.5 rounded-lg border border-[#34c759]/20 text-xs font-semibold">
                    {validationSuccess}
                  </div>
                )}

                <button
                  disabled={selectedPlanning.statut !== "planifie" || selectedPlanning.meteo_valide !== true || selectedPlanning.stock_valide !== true}
                  onClick={handleValidateIntervention}
                  className="w-full flex items-center justify-center py-2.5 bg-[#0071e3] hover:bg-[#0071e3]/90 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Démarrer l'Intervention (Météo & Stock OK)
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Create New Plan Dialog Modal */}
        {isNewPlanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 relative animate-in zoom-in-95 duration-150">
              
              <button 
                onClick={() => setIsNewPlanOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2">Planifier des Recommandations</h3>
              
              <form onSubmit={handleCreatePlan} className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Type Plan</label>
                    <select
                      value={newPlan.type_plan}
                      onChange={e => setNewPlan(prev => ({ ...prev, type_plan: e.target.value as any }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    >
                      <option value="ANNUEL">Annuel</option>
                      <option value="TRIMESTRIEL">Trimestriel</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Type Culture</label>
                    <input
                      type="text"
                      required
                      value={newPlan.type_culture}
                      onChange={e => setNewPlan(prev => ({ ...prev, type_culture: e.target.value }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                      placeholder="Ex: Olivier, Pommier"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Variété</label>
                    <input
                      type="text"
                      value={newPlan.variete}
                      onChange={e => setNewPlan(prev => ({ ...prev, variete: e.target.value }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Année</label>
                    <input
                      type="number"
                      required
                      value={newPlan.annee}
                      onChange={e => setNewPlan(prev => ({ ...prev, annee: parseInt(e.target.value) }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Trimestre (Optionnel)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={newPlan.trimestre}
                      onChange={e => setNewPlan(prev => ({ ...prev, trimestre: parseInt(e.target.value) }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Date début</label>
                    <input
                      type="date"
                      required
                      value={newPlan.date_debut}
                      onChange={e => setNewPlan(prev => ({ ...prev, date_debut: e.target.value }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">Date fin</label>
                    <input
                      type="date"
                      required
                      value={newPlan.date_fin}
                      onChange={e => setNewPlan(prev => ({ ...prev, date_fin: e.target.value }))}
                      className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Notes</label>
                  <textarea
                    value={newPlan.notes}
                    onChange={e => setNewPlan(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-medium"
                    rows={2}
                    placeholder="Instructions agronomiques spécifiques..."
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full py-2.5 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Enregistrer et Soumettre
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
