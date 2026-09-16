"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardLedgerEntry } from "../../server/dashboard-service";
import { useLedgerHighlight } from "./ledger-highlight";
import { ledgerStateRowLabel, ledgerStateStyle, ledgerUi, splitCurrency } from "./ledger-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD_CELL = "px-4 py-3 font-semibold xl:px-6";
const BODY_CELL = "px-4 py-4 align-middle xl:px-6";

function StateMark({ state }: { state: string }) {
  const style = ledgerStateStyle[state] ?? ledgerStateStyle.created;

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-[9px] w-[9px] shrink-0 rounded-full"
        style={{ backgroundColor: style.color }}
      />
      <span className="text-[13.5px] text-text-primary">
        {ledgerStateRowLabel[state] ?? style.label}
      </span>
    </span>
  );
}

/** Money in the ledger carries the masthead's treatment, one size down. */
function Amount({ value }: { value: number }) {
  const { symbol, amount } = splitCurrency(formatDashboardPrice(value));

  return (
    <span className="inline-flex items-start gap-[0.18em] leading-none">
      <span className="mt-[0.2em] text-[11px] font-medium text-text-secondary">{symbol}</span>
      <span className="text-[14.5px] font-semibold tabular-nums tracking-[-0.025em] text-text-primary">
        {amount}
      </span>
    </span>
  );
}

function OpenMark() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="h-3.5 w-3.5 text-text-secondary transition-colors duration-150 group-hover:text-primary group-focus-within:text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5 8.5 6l-4 3.5" />
    </svg>
  );
}

export function SalesLedger({ entries }: { entries: DashboardLedgerEntry[] }) {
  const { activeDate, setActiveDate } = useLedgerHighlight();
  const router = useRouter();

  /**
   * The whole row is the target, while the order number stays the real link so
   * keyboard, middle-click and open-in-new-tab keep working untouched.
   */
  const openRow = (event: React.MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    if ((event.target as HTMLElement).closest("a")) {
      return;
    }

    if (window.getSelection()?.toString()) {
      return;
    }

    router.push(`/admin/orders/${id}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[740px] border-collapse text-left">
        <caption className="sr-only">
          Órdenes registradas en el período, de la más reciente a la más antigua
        </caption>
        <thead>
          <tr className="border-y border-border bg-surface-elevated">
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL)}>
              Orden
            </th>
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL)}>
              Fecha
            </th>
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL)}>
              Cliente
            </th>
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL, "text-right")}>
              Unid.
            </th>
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL, "text-right")}>
              Total
            </th>
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL)}>
              Pago
            </th>
            <th scope="col" className={cn(ledgerUi.label, HEAD_CELL)}>
              Estado
            </th>
            <th scope="col" className="w-10 px-2">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const marked = activeDate === entry.dateKey;
            const installments =
              entry.installments && entry.installments > 1 ? entry.installments : null;

            return (
              <tr
                key={entry.id}
                onClick={(event) => openRow(event, entry.id)}
                onMouseEnter={() => setActiveDate(entry.dateKey, "ledger")}
                onMouseLeave={() => setActiveDate(null)}
                onFocus={() => setActiveDate(entry.dateKey, "ledger")}
                onBlur={() => setActiveDate(null)}
                className={cn(
                  "group cursor-pointer border-b border-border transition-colors duration-150 last:border-b-0",
                  marked ? "bg-primary-soft" : "hover:bg-surface-elevated",
                )}
              >
                <td className={BODY_CELL}>
                  <Link
                    href={`/admin/orders/${entry.id}`}
                    className={cn(
                      "text-[13.5px] font-semibold tabular-nums tracking-[-0.015em]",
                      ledgerUi.link,
                    )}
                  >
                    {entry.orderNumber}
                  </Link>
                </td>
                <td className={cn(BODY_CELL, "whitespace-nowrap")}>
                  <span className="block text-[13.5px] tabular-nums text-text-primary">
                    {entry.dateLabel}
                  </span>
                  <span className="mt-[3px] block text-[12px] tabular-nums text-text-secondary">
                    {entry.timeLabel}
                  </span>
                </td>
                <td className={cn(BODY_CELL, "max-w-[260px]")}>
                  <span className="block truncate text-[14px] font-medium tracking-[-0.012em] text-text-primary">
                    {entry.customerName}
                  </span>
                  <span className="mt-[3px] block truncate text-[12px] text-text-secondary">
                    {entry.customerEmail}
                  </span>
                </td>
                <td
                  className={cn(
                    BODY_CELL,
                    "text-right text-[14px] tabular-nums text-text-primary",
                  )}
                >
                  {formatDashboardNumber(entry.units)}
                </td>
                <td className={cn(BODY_CELL, "whitespace-nowrap text-right")}>
                  <Amount value={entry.total} />
                </td>
                <td className={cn(BODY_CELL, "whitespace-nowrap")}>
                  <span className="block text-[13.5px] text-text-primary">
                    {entry.paymentMethodLabel}
                  </span>
                  <span className="mt-[3px] block text-[12px] tabular-nums text-text-secondary">
                    {installments ? `${installments} cuotas` : "1 pago"}
                  </span>
                </td>
                <td className={cn(BODY_CELL, "whitespace-nowrap")}>
                  <StateMark state={entry.state} />
                </td>
                <td className="w-10 px-2 text-right align-middle">
                  <span className="inline-flex opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    <OpenMark />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
