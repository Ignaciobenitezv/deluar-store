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

/** The reference's "Source Of Revenue Generated", on Deluar's own UTM data. */
export function AcquisitionTable({ rows }: { rows: SourceRow[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-[#e3e8ef] bg-[#f8fafc]">
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
          <tr key={row.source} className="border-b border-[#eef2f7] last:border-b-0">
            <td className={cn(CELL, "max-w-0")}>
              <span className="block truncate text-[13.5px] text-slate-900">{row.source}</span>
            </td>
            <td className={cn(CELL, "text-right text-[13.5px] tabular-nums text-slate-600")}>
              {formatDashboardNumber(row.sessions)}
            </td>
            <td className={cn(CELL, "text-right text-[13.5px] tabular-nums text-slate-600")}>
              {formatDashboardNumber(row.productViews)}
            </td>
            <td
              className={cn(
                CELL,
                "text-right text-[13.5px] font-semibold tabular-nums text-slate-900",
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
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-[#e3e8ef] bg-[#f8fafc]">
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
          <tr key={row.productId} className="border-b border-[#eef2f7] last:border-b-0">
            <td className={cn(CELL, "max-w-0")}>
              <span className="block truncate text-[13.5px] text-slate-900">
                {row.productName}
              </span>
            </td>
            <td className={cn(CELL, "text-right text-[13.5px] tabular-nums text-slate-600")}>
              {formatDashboardNumber(row.unitsSold)}
            </td>
            <td
              className={cn(
                CELL,
                "text-right text-[13.5px] font-semibold tabular-nums text-slate-900",
              )}
            >
              {formatDashboardPrice(row.revenue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
