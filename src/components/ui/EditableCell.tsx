"use client";

import { cn } from "@/lib/utils";
import type { ColDef } from "@/hooks/useInlineEdit";

interface EditableCellProps {
  rowId: string;
  col: string;
  value: string | number | null | undefined;
  className?: string;
  colMap: Record<string, ColDef>;
  isEditing: boolean;
  isSaving: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  startEdit: (rowId: string, col: string, currentValue: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
}

export default function EditableCell({
  rowId, col, value, className = "text-xs text-white/40",
  colMap, isEditing, isSaving, editValue, setEditValue,
  editInputRef, startEdit, saveEdit, cancelEdit,
}: EditableCellProps) {
  const display = value != null && value !== "" ? String(value) : "—";
  const colDef = colMap[col];

  if (isEditing) {
    return (
      <input
        ref={editInputRef}
        type={colDef?.type === "number" ? "number" : colDef?.type === "date" ? "date" : "text"}
        value={editValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
        onBlur={saveEdit}
        className="bg-amber-500/10 border border-amber-500/40 rounded px-1.5 py-0.5 text-xs text-white/90 outline-none w-full min-w-[60px] font-mono"
        step={colDef?.type === "number" ? "any" : undefined}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => startEdit(rowId, col, display === "—" ? "" : display)}
      className={cn(
        className,
        "cursor-cell whitespace-nowrap hover:bg-amber-500/[0.06] hover:outline hover:outline-1 hover:outline-amber-500/20 rounded px-0.5 -mx-0.5 transition-colors",
        isSaving && "text-green-400"
      )}
      title="Double-cliquer pour modifier"
    >
      {display}
    </span>
  );
}
