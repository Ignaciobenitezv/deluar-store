import type { ReactNode } from "react";
import { AdminInventoryPendingChangesProvider } from "@/features/admin/inventory/context/admin-inventory-pending-changes-context";

/**
 * Layouts don't rerender on navigation within the same route segment (only
 * searchParams change when Lucila paginates or changes a filter) — so the
 * pending-changes Provider living here, instead of in page.tsx, is exactly
 * what keeps her unsaved stock edits alive across ?page=/?stock=/?q=
 * changes. It never survives leaving /admin/productos/inventario entirely,
 * which is the correct, narrower scope this was asked for.
 */
export default function AdminInventoryLayout({ children }: { children: ReactNode }) {
  return <AdminInventoryPendingChangesProvider>{children}</AdminInventoryPendingChangesProvider>;
}
