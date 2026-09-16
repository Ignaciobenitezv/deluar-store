import { TrendLine, overviewCategorical, overviewUi } from "./overview-ui";
import {
  formatDashboardNumber,
  formatDashboardPrice,
} from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD = "px-3 py-3 text-left font-semibold first:pl-6 last:pr-6";
const CELL = "px-3 py-3.5 align-middle first:pl-6 last:pr-6";

type SourceRow = {
  source: string;
  sessions: number;
  productViews: number;
  billingTotal: number;
  trend: number[];
};

/** The reference's "Source Of Revenue Generated", on Deluar's own UTM data.
 * Wrapped in its own `overflow-x-auto`: on a narrow card (mobile, or the
 * 50/50 row right at the xl cusp) five columns can need more room than the
 * card has, and this lets the table scroll on its own instead of forcing
 * the page wider — a no-op at any width where the table already fits. */
export function AcquisitionTable({ rows }: { rows: SourceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-border bg-surface-elevated">
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Fuente
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Sesiones
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Vistas
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Facturación
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "w-[26%]")}>
              Tendencia
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.source} className="border-b border-border last:border-b-0">
              <td className={cn(CELL, "max-w-0")}>
                <span className="block truncate text-[13px] text-text-primary">{row.source}</span>
              </td>
              <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
                {formatDashboardNumber(row.sessions)}
              </td>
              <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
                {formatDashboardNumber(row.productViews)}
              </td>
              <td
                className={cn(
                  CELL,
                  "text-right text-[13px] font-semibold tabular-nums text-text-primary",
                )}
              >
                {formatDashboardPrice(row.billingTotal)}
              </td>
              <td className={CELL}>
                <TrendLine
                  series={row.trend}
                  height={28}
                  color={overviewCategorical[index % overviewCategorical.length]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ProductRow = {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
};

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-border bg-surface-elevated">
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Producto
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Unid.
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Facturación
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} className="border-b border-border last:border-b-0">
              <td className={cn(CELL, "max-w-0")}>
                <span className="block truncate text-[13px] text-text-primary">
                  {row.productName}
                </span>
              </td>
              <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
                {formatDashboardNumber(row.unitsSold)}
              </td>
              <td
                className={cn(
                  CELL,
                  "text-right text-[13px] font-semibold tabular-nums text-text-primary",
                )}
              >
                {formatDashboardPrice(row.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
