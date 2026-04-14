"use client";

import { useState, useCallback, useRef } from "react";

export type ColDef = {
  dbCol: string;
  type: "text" | "number" | "date";
};

export function useInlineEdit<T extends { id: string }>(
  items: T[],
  _setItems: (items: T[]) => void,
  onSave: (id: string, dbUpdates: Record<string, unknown>) => Promise<void>,
  colMap: Record<string, ColDef>
) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const startEdit = useCallback((rowId: string, col: string, currentValue: string) => {
    setEditingCell({ rowId, col });
    if (col === "date" && currentValue.includes("/")) {
      const entry = itemsRef.current.find((e: any) => e.id === rowId);
      const dateField = (entry as any)?.date;
      setEditValue(dateField ? new Date(dateField).toISOString().split("T")[0] : currentValue);
    } else {
      setEditValue(currentValue === "—" ? "" : currentValue);
    }
    setTimeout(() => editInputRef.current?.focus(), 20);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    const colDef = colMap[col];
    if (!colDef) return;

    let dbValue: unknown;

    // Validate based on type
    if (colDef.type === "number") {
      if (editValue === "") {
        dbValue = null;
      } else {
        const num = parseFloat(editValue);
        if (isNaN(num)) {
          cancelEdit();
          return;
        }
        // Prevent unreasonably large values
        if (Math.abs(num) > 999999999) {
          cancelEdit();
          return;
        }
        dbValue = num;
      }
    } else if (colDef.type === "date") {
      if (editValue === "") {
        dbValue = null;
      } else {
        const d = new Date(editValue);
        if (isNaN(d.getTime())) {
          cancelEdit();
          return;
        }
        dbValue = editValue;
      }
    } else {
      // Text type
      const trimmed = editValue.trim();
      if (trimmed.length > 500) {
        cancelEdit();
        return;
      }
      dbValue = trimmed || null;
    }

    setSavingCell(`${rowId}-${col}`);
    setEditingCell(null);

    try {
      await onSaveRef.current(rowId, { [colDef.dbCol]: dbValue });
    } catch {
      // handled by parent re-fetch
    }
    setSavingCell(null);
  }, [editingCell, editValue, colMap, cancelEdit]);

  const isEditing = useCallback((rowId: string, col: string) =>
    editingCell?.rowId === rowId && editingCell?.col === col, [editingCell]);

  const isSaving = useCallback((rowId: string, col: string) =>
    savingCell === `${rowId}-${col}`, [savingCell]);

  return {
    editingCell, editValue, setEditValue, editInputRef,
    startEdit, cancelEdit, saveEdit, isEditing, isSaving,
    colMap,
  };
}
