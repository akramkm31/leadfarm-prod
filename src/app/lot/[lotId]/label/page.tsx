"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { NORD_A_GOLDEN_LOT_ID, lotTraceUrl } from "@/lib/lot/demo-profiles";

export default function LotLabelPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const resolvedLotId = lotId || NORD_A_GOLDEN_LOT_ID;
  const traceUrl = lotTraceUrl(
    resolvedLotId,
    process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")
  );

  useEffect(() => {
    QRCode.toDataURL(traceUrl, { width: 300, margin: 1, color: { dark: "#1a5c2a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [traceUrl]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", border: "2px solid #1a5c2a", borderRadius: 16, padding: "32px 40px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <div style={{ fontSize: 13, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
          Traçabilité produit
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a5c2a", marginBottom: 2 }}>
          Domaine Khelifa
        </div>
        <div style={{ fontSize: 14, color: "#444", marginBottom: 20 }}>
          Groupe Lechehab — Tenira, Sidi Bel Abbès
        </div>

        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR traçabilité" style={{ width: 220, height: 220, margin: "0 auto 20px", display: "block", borderRadius: 8 }} />
        ) : (
          <div style={{ width: 220, height: 220, background: "#f0f0f0", margin: "0 auto 20px", borderRadius: 8 }} />
        )}

        <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
          Scannez pour voir l&apos;historique complet
        </div>
        <div style={{ fontSize: 11, color: "#999", wordBreak: "break-all", marginBottom: 20 }}>
          {traceUrl}
        </div>

        <div style={{ background: "#f8fdf9", border: "1px solid #c8e6c9", borderRadius: 8, padding: "10px 16px", marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#1a5c2a", fontWeight: 600, marginBottom: 6 }}>🍎 Golden Delicious</div>
          <div style={{ fontSize: 11, color: "#555" }}>Lot : {resolvedLotId}</div>
          <div style={{ fontSize: 11, color: "#555" }}>Campagne 2025-2026 · Bloc Nord-A</div>
          <div style={{ fontSize: 11, color: "#555" }}>Altitude 820 m · Brix 13.2°</div>
        </div>

        <button
          onClick={() => window.print()}
          style={{ background: "#1a5c2a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Imprimer l&apos;étiquette
        </button>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
