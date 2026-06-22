"use client";

import { useMemo } from "react";
import { ChevronDown, Layers } from "lucide-react";
import type { Parcelle } from "@/lib/mock-data";
import { formatHectares } from "@/lib/utils";
import { flattenParcellesForNav } from "./ParcelleQuickNav";

type Props = {
  parcelles: Parcelle[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export default function ParcelleBottomDropdown({ parcelles, selectedId, onSelect }: Props) {
  const items = useMemo(() => flattenParcellesForNav(parcelles), [parcelles]);
  const selected = items.find((i) => i.id === selectedId);

  if (!items.length) return null;

  return (
    <div className="parcelle-bottom-select" role="region" aria-label="Sélection de parcelle">
      <div className="parcelle-bottom-select__inner">
        <Layers className="w-4 h-4 shrink-0 text-[var(--color-valley-green)]" aria-hidden />
        <label htmlFor="parcelle-bottom-select" className="parcelle-bottom-select__label">
          Parcelle
        </label>
        <div className="parcelle-bottom-select__field">
          <select
            id="parcelle-bottom-select"
            className="parcelle-bottom-select__control"
            value={selectedId ?? ""}
            onChange={(e) => {
              if (e.target.value) onSelect(e.target.value);
            }}
          >
            <option value="" disabled>
              Choisir une parcelle…
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.parentName ? `${item.parentName} / ${item.name}` : item.name}
                {item.areaHectares != null ? ` · ${formatHectares(item.areaHectares)}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="parcelle-bottom-select__chev" aria-hidden />
        </div>
        {selected?.areaHectares != null && (
          <span className="parcelle-bottom-select__meta">{formatHectares(selected.areaHectares)}</span>
        )}
      </div>
    </div>
  );
}
