"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  parcelleId: string;
  date: string;
  className?: string;
  alt?: string;
};

export default function SatelliteNdviPreview({ parcelleId, date, className, alt }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    setSrc(null);

    const params = new URLSearchParams({ parcelleId, date });
    fetch(`/api/v1/satellite-data/preview?${params}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("preview failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [parcelleId, date]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[var(--surface-canvas)]",
        className
      )}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? "Aperçu NDVI Sentinel-2"} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/30">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--interactive-green)]" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
          <p className="text-[10px] text-[var(--text-tertiary)]">Aperçu indisponible</p>
        </div>
      )}
    </div>
  );
}
