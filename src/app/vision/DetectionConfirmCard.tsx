"use client";

import { useState } from "react";
import { Check, AlertTriangle, XOctagon, Loader2 } from "lucide-react";

export interface DetectionRow {
  id: number;
  id_parcelle: number;
  id_tenant: number;
  id_capteur?: number | null;
  source: string;
  image_url?: string | null;
  maladie_detectee?: string | null;
  confiance_pct?: number | null;
  confirmation_op: "confirme" | "anomalie" | "faux_positif" | "en_attente";
}

interface DetectionConfirmCardProps {
  detection: DetectionRow;
  onActionComplete: () => void;
}

export default function DetectionConfirmCard({
  detection,
  onActionComplete
}: DetectionConfirmCardProps) {
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleAction = async (action: "confirme" | "anomalie" | "faux_positif") => {
    setSubmitting(action);
    try {
      const res = await fetch(`/api/v1/detections/${detection.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_op: action, notes: `Operator action: ${action}` }),
      });

      if (!res.ok) throw new Error("Failed to submit confirmation");
      onActionComplete();
    } catch (err) {
      alert("Failed to submit: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(null);
    }
  };

  const confPct = Number(detection.confiance_pct || 0);

  // Color coding based on confidence
  let barColor = "bg-gray-400";
  let textColor = "text-gray-500";
  if (confPct >= 80) {
    barColor = "bg-red-500";
    textColor = "text-red-500";
  } else if (confPct >= 60) {
    barColor = "bg-amber-500";
    textColor = "text-amber-500";
  }

  const defaultImageUrl = "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400";

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col max-w-sm">
      {/* Detection Image */}
      <div className="h-44 w-full bg-gray-100 relative">
        <img
          src={detection.image_url || defaultImageUrl}
          alt="Disease Target"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2.5 left-2.5 bg-black/45 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
          ID #{detection.id}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3.5 flex-1">
        {/* IA findings */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Résultat IA</span>
            <span className={`text-xs font-black font-mono ${textColor}`}>
              {confPct.toFixed(0)}%
            </span>
          </div>

          <h4 className="text-base font-extrabold text-gray-800 capitalize leading-tight">
            {detection.maladie_detectee || "Inconnue"}
          </h4>

          {/* Confidence Bar */}
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${confPct}%` }} />
          </div>
        </div>

        {/* Action Panel */}
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <button
            disabled={submitting !== null}
            onClick={() => handleAction("confirme")}
            className="flex flex-col items-center justify-center py-2 bg-red-50 hover:bg-red-100/70 border border-red-200/50 rounded-xl text-red-600 font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            {submitting === "confirme" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">Confirmer</span>
              </>
            )}
          </button>

          <button
            disabled={submitting !== null}
            onClick={() => handleAction("anomalie")}
            className="flex flex-col items-center justify-center py-2 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/50 rounded-xl text-amber-600 font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            {submitting === "anomalie" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">Anomalie</span>
              </>
            )}
          </button>

          <button
            disabled={submitting !== null}
            onClick={() => handleAction("faux_positif")}
            className="flex flex-col items-center justify-center py-2 bg-gray-50 hover:bg-gray-100/70 border border-gray-200/60 rounded-xl text-gray-600 font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            {submitting === "faux_positif" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <XOctagon className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">Faux Positif</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
