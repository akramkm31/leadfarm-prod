"use client";

import { createContext, useContext, useMemo, useState } from "react";

const HeaderActionsStateContext = createContext<React.ReactNode>(null);
const HeaderActionsDispatchContext = createContext<(actions: React.ReactNode) => void>(() => {});

export function HeaderActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<React.ReactNode>(null);
  const dispatch = useMemo(() => setActions, []);

  return (
    <HeaderActionsDispatchContext.Provider value={dispatch}>
      <HeaderActionsStateContext.Provider value={actions}>{children}</HeaderActionsStateContext.Provider>
    </HeaderActionsDispatchContext.Provider>
  );
}

export function useSetHeaderActions() {
  return useContext(HeaderActionsDispatchContext);
}

export function useHeaderActionsSlot() {
  return useContext(HeaderActionsStateContext);
}
