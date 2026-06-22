import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button-1";

export default function DashboardEmptyMapState() {
  return (
    <div className="dash-map-empty" role="status">
      <div className="dash-map-empty-icon" aria-hidden>
        <MapPin className="w-7 h-7 text-void" strokeWidth={1.5} />
      </div>
      <p className="dash-map-empty-title">Aucune parcelle sur la carte</p>
      <p className="dash-map-empty-desc">
        Créez ou importez vos parcelles pour visualiser le domaine et l&apos;historique des
        traitements.
      </p>
      <Button variant="mono" size="sm" className="rounded-full shadow-sm" asChild>
        <Link href="/parcelles">
          <Plus className="w-3.5 h-3.5" />
          Gérer les parcelles
        </Link>
      </Button>
      <Link
        href="/parcelles?draw=1"
        className="text-xs text-graphite hover:text-void transition-colors"
      >
        Dessiner une nouvelle parcelle
      </Link>
    </div>
  );
}
