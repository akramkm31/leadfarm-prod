"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import AlertsPanel from "./AlertsPanel";

type OpenOptions = { highlightId?: string };

type AlertsContextValue = {
  open: boolean;
  highlightId: string | null;
  openAlerts: (opts?: OpenOptions) => void;
  closeAlerts: () => void;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const openAlerts = useCallback((opts?: OpenOptions) => {
    setHighlightId(opts?.highlightId ?? null);
    setOpen(true);
  }, []);

  const closeAlerts = useCallback(() => {
    setOpen(false);
    setHighlightId(null);
  }, []);

  const value = useMemo(
    () => ({ open, highlightId, openAlerts, closeAlerts }),
    [open, highlightId, openAlerts, closeAlerts]
  );

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <AlertsPanel open={open} highlightId={highlightId} onClose={closeAlerts} />
    </AlertsContext.Provider>
  );
}

export function useAlertsPanel() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlertsPanel must be used within AlertsProvider");
  return ctx;
}
