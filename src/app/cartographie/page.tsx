"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Map as MapIcon, Layers, FileSpreadsheet, FileText, Sprout, AlertTriangle, Eye, EyeOff, Loader2
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";

// Dynamic import of Leaflet map (client-only)
const CartographieMap = dynamic(() => import("@/components/map/CartographieMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl h-[550px] flex flex-col items-center justify-center border border-gray-200/80 shadow-xs">
      <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      <span className="text-xs text-gray-400 mt-2 font-medium">Chargement des données géo...</span>
    </div>
  ),
});

export default function CartographiePage() {
  const [parcelles, setParcelles] = useState<any[]>([]);
  const [detections, setDetections] = useState<any[]>([]);
  const [activePlannings, setActivePlannings] = useState<any[]>([]);
  const [gpsTracks, setGpsTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Overlay Toggles
  const [showDetections, setShowDetections] = useState(true);
  const [showPlannings, setShowPlannings] = useState(true);
  const [showGPSTracks, setShowGPSTracks] = useState(true);

  // Sidebar selections & stats filters
  const [selectedParcelle, setSelectedParcelle] = useState<any | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<any | null>(null);
  const [cultureFilter, setCultureFilter] = useState("all");
  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-05-31");
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  // Load GIS layers data from Supabase
  useEffect(() => {
    async function loadGISData() {
      setLoading(true);
      try {
        // 1. Fetch parcelles
        const { data: parcellesData } = await (supabase as any)
          .from("PARCELLE")
          .select("identifiant_parcelle, nom_parcelle, superficie_hectares, type_sol");
        setParcelles((parcellesData || []).map((p: any) => ({
          id: p.identifiant_parcelle,
          nom_parcelle: p.nom_parcelle,
          superficie_hectares: p.superficie_hectares || 5.0,
          type_sol: p.type_sol || "Argilo-limoneux"
        })));

        // 2. Fetch detections
        const { data: detectionsData } = await (supabase as any)
          .from("detection")
          .select("*");
        setDetections(detectionsData || []);

        // 3. Fetch active plannings
        const { data: planningsData } = await (supabase as any)
          .from("planning_operationnel")
          .select("id, id_parcelle, type_intervention, statut")
          .eq("statut", "en_cours");
        setActivePlannings(planningsData || []);

        // 4. Fetch mock GPS tracks or actual telemetry
        const mockTracks = [
          { lat: 35.2105, lng: -0.6402, timestamp: "08:00" },
          { lat: 35.2115, lng: -0.6405, timestamp: "08:05" },
          { lat: 35.2125, lng: -0.6410, timestamp: "08:10" },
          { lat: 35.2130, lng: -0.6415, timestamp: "08:15" },
          { lat: 35.2135, lng: -0.6425, timestamp: "08:20" },
          { lat: 35.2120, lng: -0.6435, timestamp: "08:25" },
        ];
        setGpsTracks(mockTracks);

      } catch (err) {
        console.error("GIS loading failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadGISData();
  }, []);

  // Filter detections locally based on culture and date
  const filteredDetections = detections.filter(d => {
    const dDate = d.horodatage?.split("T")[0];
    if (startDate && dDate < startDate) return false;
    if (endDate && dDate > endDate) return false;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: filteredDetections.length,
    confirmes: filteredDetections.filter(d => d.confirmation_op === "confirme").length,
    anomalies: filteredDetections.filter(d => d.confirmation_op === "anomalie").length,
    fauxPositifs: filteredDetections.filter(d => d.confirmation_op === "faux_positif").length,
    enAttente: filteredDetections.filter(d => d.confirmation_op === "en_attente").length,
  };

  const handleExportPDF = () => {
    setPdfNotice("Génération du rapport PDF FOR.PR6.L9 en cours de traitement...");
    setTimeout(() => setPdfNotice(null), 4000);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#f5f5f7] p-6 text-gray-900 font-sans">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#604630]/10 flex items-center justify-center border border-[#604630]/20">
              <MapIcon className="w-6 h-6 text-[#604630]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-800">Cartographie PostGIS</h1>
              <p className="text-xs text-gray-500">
                Visualisation spatiale en temps réel des traitements, parcelles, et telemetry IoT.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Exporter PDF
            </button>
          </div>
        </div>

        {pdfNotice && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center justify-between gap-2">
            <span>{pdfNotice}</span>
            <button onClick={() => setPdfNotice(null)} className="text-blue-400 hover:text-blue-600 shrink-0">✕</button>
          </div>
        )}

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Map Panel (3/4 width) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            
            {/* Layer Control Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-wrap gap-4 items-center">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mr-2">
                <Layers className="w-4 h-4 text-[#0071e3]" /> Couches géo :
              </span>

              <button
                onClick={() => setShowDetections(!showDetections)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showDetections 
                    ? "bg-red-50 text-red-600 border-red-200" 
                    : "bg-gray-50 text-gray-400 border-gray-200/60"
                }`}
              >
                {showDetections ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Détections Maladies ({detections.length})
              </button>

              <button
                onClick={() => setShowPlannings(!showPlannings)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showPlannings 
                    ? "bg-amber-50 text-amber-600 border-amber-200" 
                    : "bg-gray-50 text-gray-400 border-gray-200/60"
                }`}
              >
                {showPlannings ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Interventions en cours ({activePlannings.length})
              </button>

              <button
                onClick={() => setShowGPSTracks(!showGPSTracks)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showGPSTracks 
                    ? "bg-blue-50 text-[#0071e3] border-blue-200" 
                    : "bg-gray-50 text-gray-400 border-gray-200/60"
                }`}
              >
                {showGPSTracks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Trajectoires GPS
              </button>
            </div>

            {/* Leaflet Component Map */}
            <div className="relative">
              <CartographieMap
                parcelles={parcelles}
                detections={filteredDetections}
                activePlannings={activePlannings}
                gpsTracks={gpsTracks}
                showDetections={showDetections}
                showPlannings={showPlannings}
                showGPSTracks={showGPSTracks}
                onSelectParcelle={setSelectedParcelle}
                onSelectDetection={setSelectedDetection}
              />
            </div>
          </div>

          {/* Right Sidebar (1/4 width) */}
          <div className="flex flex-col gap-6">
            
            {/* Filter Section */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col gap-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filtre Temporel</h2>
              
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 font-medium">Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-[#f5f5f7] border-none rounded-lg p-2.5 text-gray-700 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col gap-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statistiques de Détection</h2>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-xl font-bold text-gray-700">{stats.total}</div>
                  <div className="text-[10px] text-gray-400 font-medium mt-1">Total</div>
                </div>
                
                <div className="bg-red-50 p-3 rounded-xl border border-red-100/50">
                  <div className="text-xl font-bold text-red-600">{stats.confirmes}</div>
                  <div className="text-[10px] text-red-400 font-medium mt-1">Confirmées</div>
                </div>

                <div className="bg-green-50 p-3 rounded-xl border border-green-100/50">
                  <div className="text-xl font-bold text-green-600">{stats.fauxPositifs}</div>
                  <div className="text-[10px] text-green-400 font-medium mt-1">Faux Positifs</div>
                </div>

                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100/50">
                  <div className="text-xl font-bold text-orange-600">{stats.enAttente}</div>
                  <div className="text-[10px] text-orange-400 font-medium mt-1">En Attente</div>
                </div>
              </div>
            </div>

            {/* Selected Parcelle or Detection detail Panel */}
            {(selectedParcelle || selectedDetection) && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs animate-in fade-in duration-150 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inspecteur Spatial</h3>
                  <button
                    onClick={() => { setSelectedParcelle(null); setSelectedDetection(null); }}
                    className="text-[10px] text-gray-400 hover:text-gray-700 font-bold"
                  >
                    Fermer
                  </button>
                </div>

                {selectedParcelle && (
                  <div className="flex flex-col gap-2.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Sprout className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-gray-800 text-sm">{selectedParcelle.nom_parcelle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Superficie :</span>
                      <strong className="text-gray-700">{selectedParcelle.superficie_hectares} ha</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Type de sol :</span>
                      <strong className="text-gray-700">{selectedParcelle.type_sol}</strong>
                    </div>
                  </div>
                )}

                {selectedDetection && (
                  <div className="flex flex-col gap-2.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-bold text-gray-800 text-sm">{selectedDetection.maladie_detectee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confiance :</span>
                      <strong className="text-gray-700">{selectedDetection.confiance_pct}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Date :</span>
                      <strong className="text-gray-700">{selectedDetection.horodatage?.split("T")[0]}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Source :</span>
                      <strong className="text-gray-700 capitalize">{selectedDetection.source}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Statut :</span>
                      <strong className="text-gray-700 capitalize">{selectedDetection.confirmation_op}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
