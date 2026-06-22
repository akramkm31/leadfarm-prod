"use client";

export default function DashboardMagasinierLegend() {
  return (
    <div className="mag-legend" aria-label="Légende carte">
      <span className="mag-leg-pill">
        <span className="mag-leg-dot mag-leg-dot--ok" aria-hidden />
        Stock OK
      </span>
      <span className="mag-leg-pill">
        <span className="mag-leg-dot mag-leg-dot--warn" aria-hidden />
        Alertes
      </span>
      <span className="mag-leg-pill">
        <span className="mag-leg-dot mag-leg-dot--empty" aria-hidden />
        Aucun produit
      </span>
    </div>
  );
}
