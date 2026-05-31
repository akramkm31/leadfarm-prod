"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to observability service (Sentry etc.) in production
    console.error("[LeadFarm] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[32px] border border-[rgba(29,29,31,0.08)] shadow-xl p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-[#ff3b30]" />
        </div>
        <h1 className="text-2xl font-black text-[#1d1d1f] mb-2">
          Une erreur est survenue
        </h1>
        <p className="text-sm text-[#707070] mb-2 leading-relaxed">
          Une erreur inattendue a interrompu le chargement de cette page.
          Vos données sont en sécurité.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-[#707070] bg-[#f5f5f7] rounded-xl px-3 py-2 mb-6">
            ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#0071e3] text-[var(--color-adaline-ink)] text-sm font-bold hover:bg-[#0066cc] transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-[rgba(29,29,31,0.12)] text-sm font-bold text-[#1d1d1f] hover:bg-[rgba(29,29,31,0.04)] transition-colors"
          >
            <Home className="w-4 h-4" />
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
