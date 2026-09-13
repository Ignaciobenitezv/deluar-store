import { overviewUi } from "../overview/overview-ui";
import { customerColor } from "./customer-palette";
import { CustomerInitials } from "./customer-modules";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD = "px-3 py-2.5 text-left font-semibold whitespace-nowrap first:pl-5 last:pr-5";
const CELL = "px-3 py-3 align-middle whitespace-nowrap text-[13px] text-slate-600 first:pl-5 last:pr-5";

type TopCustomer = {
  key: string;
  displayName: string;
  periodOrders: number;
  periodRevenue: number;
  periodAverageTicket: number;
};

export function TopCustomersTable({ rows }: { rows: TopCustomer[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Ningún cliente registró compras en el período.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-[#e2e8f0] bg-[#f8fafc]">
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-9")}>
            #
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD)}>
            Cliente
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Pedidos
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Facturación
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Ticket prom.
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.key} className="border-b border-[#eef2f7] last:border-b-0">
            <td className={cn(CELL, "tabular-nums text-slate-400")}>{index + 1}</td>
            <td className={cn(CELL, "max-w-0")}>
              <span className="flex min-w-0 items-center gap-2.5">
                <CustomerInitials name={row.displayName} />
                <span className="min-w-0 truncate text-[13px] text-slate-900">
                  {row.displayName}
                </span>
              </span>
            </td>
            <td className={cn(CELL, "text-right tabular-nums")}>
              {formatDashboardNumber(row.periodOrders)}
            </td>
            <td className={cn(CELL, "text-right font-semibold tabular-nums text-slate-900")}>
              {formatDashboardPrice(row.periodRevenue)}
            </td>
            <td className={cn(CELL, "text-right tabular-nums")}>
              {formatDashboardPrice(row.periodAverageTicket)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type BarRow = {
  key: string;
  label: string;
  value: number;
  share: number;
};

/** The compact horizontal bar list the reference uses three times over. */
export function ShareBars({
  rows,
  emptyMessage,
  labelWidth = 92,
}: {
  rows: BarRow[];
  emptyMessage: string;
  labelWidth?: number;
}) {
  if (rows.length === 0) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
  }

  return (
    <ul className="px-5 pb-5">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 py-[6px]">
          <span
            className="shrink-0 truncate text-[13px] text-slate-700"
            style={{ width: labelWidth }}
          >
            {row.label}
          </span>
          {/* The bar is the percentage: a 42% share fills 42% of the rail, so
              length and number never disagree. */}
          <span
            aria-hidden
            className="block h-[16px] min-w-0 flex-1 overflow-hidden rounded-[3px]"
            style={{ backgroundColor: customerColor.track }}
          >
            <span
              className="block h-full rounded-[3px]"
              style={{
                width: `${Math.min(Math.max(row.share, row.share > 0 ? 3 : 0), 100)}%`,
                backgroundColor: customerColor.primary,
              }}
            />
          </span>
          <span className="w-9 shrink-0 text-right text-[12.5px] tabular-nums text-slate-500">
            {row.share.toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

type CustomerRow = {
  key: string;
  displayName: string;
  email: string;
  periodOrders: number;
  periodUnits: number;
  periodRevenue: number;
  lastPurchaseLabel: string;
  status: "Nuevo" | "Recurrente";
};

/**
 * Analytical evidence, not a CRM: the list reads the period's buyers and their
 * behaviour, with the segment derived from purchase history rather than set by
 * hand anywhere.
 */
export function CustomerListTable({ rows }: { rows: CustomerRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="border-y border-[#e2e8f0] bg-[#f8fafc]">
            <th scope="col" className={cn(overviewUi.label, HEAD, "w-9")}>
              #
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Cliente
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Email
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Pedidos
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Unidades
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Facturación
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Última compra
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Segmento
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-6 text-center text-[12.5px] text-slate-500">
                Ningún cliente coincide con estos filtros en el período.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const recurrent = row.status === "Recurrente";

              return (
                <tr
                  key={row.key}
                  className="border-b border-[#eef2f7] transition-colors last:border-b-0 hover:bg-[#f8fafc]"
                >
                  <td className={cn(CELL, "tabular-nums text-slate-400")}>{index + 1}</td>
                  <td className={cn(CELL, "max-w-0")}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <CustomerInitials name={row.displayName} />
                      <span className="min-w-0 truncate text-[13px] text-slate-900">
                        {row.displayName}
                      </span>
                    </span>
                  </td>
                  <td className={cn(CELL, "max-w-0")}>
                    <span className="block truncate text-[13px] text-[#3b7ff5]">{row.email}</span>
                  </td>
                  <td className={cn(CELL, "text-right tabular-nums")}>
                    {formatDashboardNumber(row.periodOrders)}
                  </td>
                  <td className={cn(CELL, "text-right tabular-nums")}>
                    {formatDashboardNumber(row.periodUnits)}
                  </td>
                  <td className={cn(CELL, "text-right font-semibold tabular-nums text-slate-900")}>
                    {formatDashboardPrice(row.periodRevenue)}
                  </td>
                  <td className={cn(CELL, "tabular-nums")}>{row.lastPurchaseLabel}</td>
                  <td className={CELL}>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[12px] font-medium"
                      style={{
                        backgroundColor: recurrent ? customerColor.tileSecondary : customerColor.tilePrimary,
                        color: recurrent ? "#2563c9" : customerColor.primary,
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
