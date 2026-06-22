"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type HeaderMeta = {
  title?: string;
  subtitle?: string;
};

const HeaderMetaStateContext = createContext<HeaderMeta | null>(null);
const HeaderMetaDispatchContext = createContext<(meta: HeaderMeta | null) => void>(() => {});

export function HeaderMetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<HeaderMeta | null>(null);
  const dispatch = useMemo(() => setMeta, []);

  return (
    <HeaderMetaDispatchContext.Provider value={dispatch}>
      <HeaderMetaStateContext.Provider value={meta}>{children}</HeaderMetaStateContext.Provider>
    </HeaderMetaDispatchContext.Provider>
  );
}

export function useSetHeaderMeta() {
  return useContext(HeaderMetaDispatchContext);
}

export function useHeaderMeta() {
  return useContext(HeaderMetaStateContext);
}
