import Link from "next/link";
import type {
  PaymentMethodRow,
  PaymentRecordRow,
} from "@/features/admin/analytics/server/payments-analytics-service";
import { overviewUi } from "../overview/overview-ui";
import { toneForStatus } from "./payments-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD = "px-3 py-2.5 text-left font-semibold whitespace-nowrap first:pl-5 last:pr-5";
const CELL =
  "px-3 py-3 align-middle whitespace-nowrap text-[13px] text-slate-600 first:pl-5 last:pr-5";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

function formatPaymentDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

/**
 * Volume, money and a rate per method. The rate is printed only where a
 * denominator exists — a method whose payments are all still pending has no
 * approval rate yet, and an em dash says so rather than a fabricated 0%.
 */
export function PaymentMethodTable({ rows }: { rows: PaymentMethodRow[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Ningún método registró pagos en el período.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-[#e2e8f0] bg-[#f8fafc]">
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Método
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Pagos
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Monto
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Tasa aprob.
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.method} className="border-b border-[#eef2f7] last:border-b-0">
              <td className={cn(CELL, "max-w-0")}>
                <span className="block truncate text-[13px] text-slate-900">{row.label}</span>
              </td>
              <td className={cn(CELL, "text-right tabular-nums")}>
                {formatDashboardNumber(row.payments)}
              </td>
              <td className={cn(CELL, "text-right font-semibold tabular-nums text-slate-900")}>
                {formatDashboardPrice(row.revenue)}
              </td>
              <td className={cn(CELL, "text-right tabular-nums")}>
                {row.approvalRate === null ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <span
                    className="font-medium"
                    style={{
                      color: toneForStatus(row.approvalRate >= 90 ? "APPROVED" : "REJECTED").color,
                    }}
                  >
                    {row.approvalRate.toFixed(0)}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentStatusBadge({ status, label }: { status: string; label: string }) {
  const tone = toneForStatus(status);

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[12px] font-medium"
      style={{ backgroundColor: tone.soft, color: tone.ink }}
    >
      {label}
    </span>
  );
}

/**
 * Evidence for the analysis above, not another order screen: the row carries
 * what explains the numbers and nothing to act on. The order number links out
 * for anyone who needs the operational view.
 */
export function RecentPaymentsTable({ rows }: { rows: PaymentRecordRow[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        No se registraron pagos en el período seleccionado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse">
        <thead>
          <tr className="border-y border-[#e2e8f0] bg-[#f8fafc]">
            <th scope="col" className={cn(overviewUi.label, HEAD, "w-9")}>
              #
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Fecha
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Orden
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Cliente
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Método de pago
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
              Importe
            </th>
            <th scope="col" className={cn(overviewUi.label, HEAD)}>
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className="border-b border-[#eef2f7] transition-colors last:border-b-0 hover:bg-[#f8fafc]"
            >
              <td className={cn(CELL, "tabular-nums text-slate-400")}>{index + 1}</td>
              <td className={cn(CELL, "tabular-nums")}>{formatPaymentDate(row.createdAt)}</td>
              <td className={CELL}>
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(row.orderNumber)}`}
                  className="text-[13px] font-medium text-[#3b7ff5] underline-offset-[3px] hover:underline"
                >
                  {row.orderNumber}
                </Link>
              </td>
              <td className={cn(CELL, "max-w-0")}>
                <span className="block truncate text-[13px] text-slate-900">{row.customerName}</span>
              </td>
              <td className={CELL}>{row.methodLabel}</td>
              <td className={cn(CELL, "text-right font-semibold tabular-nums text-slate-900")}>
                {formatDashboardPrice(row.amount)}
              </td>
              <td className={CELL}>
                <PaymentStatusBadge status={row.status} label={row.statusLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
