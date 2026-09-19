import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { ledgerUi } from "./ledger-ui";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

type LedgerPaginationProps = {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalEntries: number;
  buildHref: (page: number) => string;
};

export function LedgerPagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalEntries,
  buildHref,
}: LedgerPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3.5">
      <p className={ledgerUi.note}>
        Mostrando{" "}
        <span className="tabular-nums text-text-primary">
          {formatDashboardNumber(rangeStart)}–{formatDashboardNumber(rangeEnd)}
        </span>{" "}
        de{" "}
        <span className="tabular-nums text-text-primary">
          {formatDashboardNumber(totalEntries)}
        </span>{" "}
        {totalEntries === 1 ? "orden" : "órdenes"}
      </p>

      {totalPages > 1 ? <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} /> : null}
    </div>
  );
}
