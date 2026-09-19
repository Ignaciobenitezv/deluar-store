"use client";

import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { useAdminInventoryPendingChanges } from "../context/admin-inventory-pending-changes-context";

function buildOutcomeMessage(
  outcome: NonNullable<ReturnType<typeof useAdminInventoryPendingChanges>["lastOutcome"]>,
) {
  if (outcome.status === "error") {
    return { tone: "danger" as const, text: outcome.message ?? "No pudimos guardar los cambios." };
  }

  const { result } = outcome;
  const total = result.results.length;

  if (result.productsWithIssues === 0) {
    return {
      tone: "success" as const,
      text: `${total} producto${total === 1 ? "" : "s"} actualizado${total === 1 ? "" : "s"} correctamente.`,
    };
  }

  return {
    tone: "warning" as const,
    text: `${result.productsApplied} de ${total} productos se guardaron. ${result.productsWithIssues} tuvieron un problema — revisá las filas marcadas.`,
  };
}

export function AdminInventoryPendingBar() {
  const { pendingCount, saving, save, discardAll, lastOutcome, dismissOutcome } = useAdminInventoryPendingChanges();

  const outcomeMessage = lastOutcome ? buildOutcomeMessage(lastOutcome) : null;

  if (pendingCount === 0 && !outcomeMessage) {
    return null;
  }

  return (
    <div
      className={cn(
        // Below `lg` the admin's floating bottom nav (admin-bottom-nav.tsx)
        // sits fixed at ~0.75rem + safe-area from the bottom, ~56px tall —
        // this bar needs enough clearance to never sit under it. At `lg+`
        // that nav is hidden (lg:hidden on it), so a small offset is enough.
        "sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mt-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[0_8px_28px_-8px_rgba(15,23,42,0.28)] lg:bottom-4",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {pendingCount > 0 ? (
            <p className="text-sm font-semibold text-text-primary">
              {pendingCount} cambio{pendingCount === 1 ? "" : "s"} pendiente{pendingCount === 1 ? "" : "s"}
            </p>
          ) : null}
          {outcomeMessage ? (
            <p
              className={cn(
                "text-[13px] leading-5",
                outcomeMessage.tone === "success" && "text-success",
                outcomeMessage.tone === "warning" && "text-warning",
                outcomeMessage.tone === "danger" && "text-danger",
              )}
            >
              {outcomeMessage.text}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={discardAll}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              Descartar
            </button>
          ) : null}

          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-xl border px-4 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                dashboardUi.primaryAction,
              )}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissOutcome}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
