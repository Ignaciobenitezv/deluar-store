"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyInventoryStockChangesAction } from "../actions/apply-inventory-stock-changes-action";
import type { AdminInventoryApplyResult } from "../server/admin-inventory-stock-service";

export type PendingRowKind = "base" | "variant";

export type PendingRowIssue = {
  message: string;
};

export type PendingRow = {
  productId: string;
  productTitle: string;
  rowKey: string;
  kind: PendingRowKind;
  rowLabel: string;
  originalStock: number;
  newStock: number;
  issue?: PendingRowIssue;
};

type SaveOutcome =
  | { status: "success"; result: AdminInventoryApplyResult }
  | { status: "error"; message: string };

type AdminInventoryPendingChangesContextValue = {
  pendingCount: number;
  saving: boolean;
  lastOutcome: SaveOutcome | null;
  getPendingRow: (productId: string, rowKey: string) => PendingRow | undefined;
  setRowStock: (args: {
    productId: string;
    productTitle: string;
    rowKey: string;
    kind: PendingRowKind;
    rowLabel: string;
    originalStock: number;
    newStock: number;
  }) => void;
  undoRow: (productId: string, rowKey: string) => void;
  discardAll: () => void;
  save: () => Promise<void>;
  dismissOutcome: () => void;
};

const AdminInventoryPendingChangesContext = createContext<AdminInventoryPendingChangesContextValue | null>(null);

function buildEntryKey(productId: string, rowKey: string) {
  return `${productId}::${rowKey}`;
}

export function AdminInventoryPendingChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [rows, setRows] = useState<Map<string, PendingRow>>(new Map());
  const [saving, setSaving] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<SaveOutcome | null>(null);

  const getPendingRow = useCallback(
    (productId: string, rowKey: string) => rows.get(buildEntryKey(productId, rowKey)),
    [rows],
  );

  const setRowStock = useCallback<AdminInventoryPendingChangesContextValue["setRowStock"]>((args) => {
    setRows((current) => {
      const next = new Map(current);
      const entryKey = buildEntryKey(args.productId, args.rowKey);

      if (args.newStock === args.originalStock) {
        next.delete(entryKey);
        return next;
      }

      next.set(entryKey, {
        productId: args.productId,
        productTitle: args.productTitle,
        rowKey: args.rowKey,
        kind: args.kind,
        rowLabel: args.rowLabel,
        originalStock: args.originalStock,
        newStock: args.newStock,
      });
      return next;
    });
  }, []);

  const undoRow = useCallback((productId: string, rowKey: string) => {
    setRows((current) => {
      const next = new Map(current);
      next.delete(buildEntryKey(productId, rowKey));
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    setRows(new Map());
    setLastOutcome(null);
  }, []);

  const dismissOutcome = useCallback(() => setLastOutcome(null), []);

  const save = useCallback(async () => {
    if (rows.size === 0 || saving) {
      return;
    }

    setSaving(true);

    const byProduct = new Map<string, { productId: string; rows: { key: string; kind: PendingRowKind; originalStock: number; newStock: number }[] }>();

    for (const row of rows.values()) {
      const existing = byProduct.get(row.productId) ?? { productId: row.productId, rows: [] };
      existing.rows.push({ key: row.rowKey, kind: row.kind, originalStock: row.originalStock, newStock: row.newStock });
      byProduct.set(row.productId, existing);
    }

    const payload = [...byProduct.values()];

    try {
      const state = await applyInventoryStockChangesAction(JSON.stringify(payload));

      if (state.status === "error") {
        setLastOutcome({ status: "error", message: state.message });
        return;
      }

      setRows((current) => {
        const next = new Map(current);

        for (const productResult of state.result.results) {
          if (productResult.status === "not_found" || productResult.status === "conflict" || productResult.status === "error") {
            // Keep every pending row for this product so Lucila can retry —
            // flag them with the reason instead of silently discarding her
            // edits.
            for (const [entryKey, row] of next.entries()) {
              if (row.productId === productResult.productId) {
                next.set(entryKey, { ...row, issue: { message: productResult.message ?? "No se pudo guardar." } });
              }
            }
            continue;
          }

          for (const rowResult of productResult.rows) {
            const entryKey = buildEntryKey(productResult.productId, rowResult.key);
            const pendingRow = next.get(entryKey);

            if (!pendingRow) {
              continue;
            }

            if (rowResult.status === "applied" || rowResult.status === "no_change") {
              next.delete(entryKey);
              continue;
            }

            if (rowResult.status === "would_go_negative") {
              next.set(entryKey, {
                ...pendingRow,
                originalStock: rowResult.before ?? pendingRow.originalStock,
                issue: { message: "El stock real bajó y este cambio dejaría el valor en negativo. Revisá el valor actual." },
              });
              continue;
            }

            if (rowResult.status === "missing") {
              next.set(entryKey, {
                ...pendingRow,
                issue: { message: "Esta variante ya no existe — es posible que se haya editado o eliminado." },
              });
            }
          }
        }

        return next;
      });

      setLastOutcome({ status: "success", result: state.result });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [rows, saving, router]);

  const value = useMemo<AdminInventoryPendingChangesContextValue>(
    () => ({
      pendingCount: rows.size,
      saving,
      lastOutcome,
      getPendingRow,
      setRowStock,
      undoRow,
      discardAll,
      save,
      dismissOutcome,
    }),
    [rows.size, saving, lastOutcome, getPendingRow, setRowStock, undoRow, discardAll, save, dismissOutcome],
  );

  return (
    <AdminInventoryPendingChangesContext.Provider value={value}>{children}</AdminInventoryPendingChangesContext.Provider>
  );
}

export function useAdminInventoryPendingChanges() {
  const context = useContext(AdminInventoryPendingChangesContext);

  if (!context) {
    throw new Error("useAdminInventoryPendingChanges must be used within AdminInventoryPendingChangesProvider");
  }

  return context;
}
