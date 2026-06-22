"use client";

import { Satellite, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button-1";

type Props = {
  error?: "empty" | "fetch" | "forbidden" | null;
  onRefresh?: () => void;
  loading?: boolean;
};

const COPY = {
  empty: {
    title: "Aucune acquisition satellite",
    body: "Les indices NDVI et NDWI (Sentinel-2) s'afficheront ici dès la première synchronisation avec vos parcelles.",
  },
  fetch: {
    title: "Synchronisation indisponible",
    body: "Impossible de charger les données satellite. Vérifiez votre connexion ou réessayez dans quelques instants.",
  },
  forbidden: {
    title: "Accès satellite restreint",
    body: "Votre profil n'a pas l'autorisation de consulter les indices satellite. Contactez l'administrateur de l'exploitation.",
  },
} as const;

export default function AgroSatelliteEmptyState({ error = "empty", onRefresh, loading }: Props) {
  const key = error && error in COPY ? error : "empty";
  const copy = COPY[key];

  return (
    <div className="agro-glass agro-sat-empty" role="status">
      <div className="agro-sat-empty-icon" aria-hidden>
        <Satellite className="w-5 h-5" />
      </div>
      <p className="agro-sat-empty-title">{copy.title}</p>
      <p className="agro-sat-empty-body">{copy.body}</p>
      {onRefresh && key !== "forbidden" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full mt-2"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cnIcon(loading)} aria-hidden />
          Actualiser
        </Button>
      )}
    </div>
  );
}

function cnIcon(loading?: boolean) {
  return loading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5";
}
