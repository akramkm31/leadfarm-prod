"use client";

import { useCallback, useEffect, useState } from "react";

export function useMcdResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur de chargement");
      setData(json.data as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
