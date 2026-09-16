import Link from "next/link";
import type { DashboardLedgerEntry } from "@/features/admin/dashboard/server/dashboard-service";
import { formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { formatRelativeTime } from "./home-ui";
import { IconArrow } from "./home-icons";
import { cn } from "@/lib/utils";

/** The dot is the order's real state, not a colour per row. */
function stateToneClass(state: DashboardLedgerEntry["state"]) {
  switch (state) {
    case "paid":
      return "bg-success";
    case "pending":
      return "bg-warning";
    case "failed":
    case "cancelled":
      return "bg-danger";
    default:
      return "bg-text-secondary";
  }
}

/** Deluar keeps no audit log, so this is not an activity feed pretending to be
 * one: it is the orders themselves, which is the only recent activity the
 * store actually records. */
export function RecentOrders({ orders, now }: { orders: DashboardLedgerEntry[]; now: Date }) {
  if (orders.length === 0) {
    return <p className="px-4 py-5 text-[12.5px] text-text-secondary">Todavía no hay pedidos en los últimos 30 días.</p>;
  }

  return (
    <ul className="px-2 py-1.5">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}
            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150 hover:bg-surface-elevated"
          >
            <span aria-hidden className={cn("h-[7px] w-[7px] shrink-0 rounded-full", stateToneClass(order.state))} />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-text-primary">{order.orderNumber}</span>
              <span className="mt-[1px] block truncate text-[12px] text-text-secondary">
                {order.customerName} · {order.statusLabel}
              </span>
            </span>

            <span className="w-[96px] shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-text-primary">
              {formatDashboardPrice(order.total)}
            </span>

            <span className="hidden w-[80px] shrink-0 text-right text-[11.5px] tabular-nums text-text-secondary sm:block">
              {formatRelativeTime(new Date(order.createdAt), now)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type QuickAction = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/** Four destinations that exist. Nothing here is aspirational. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-1.5 p-3 sm:grid-cols-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 transition-colors duration-150 hover:border-primary/30 hover:bg-surface-elevated"
        >
          <span aria-hidden className="shrink-0 text-text-secondary">
            {action.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-text-primary">{action.label}</span>
          <IconArrow className="h-[13px] w-[13px] shrink-0 text-text-secondary transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}

function IconCart({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 3.4h2.4l2.2 10.6h10.1l1.9-7.6H6.6" />
      <circle cx="9.4" cy="19.4" r="1.6" />
      <circle cx="17.4" cy="19.4" r="1.6" />
    </svg>
  );
}

/** The banner that closes the page. It says what the Admin is for rather than
 * reporting a number, so it carries no figure that could go stale or wrong. */
export function StorefrontBanner() {
  return (
    <Link
      href="/"
      target="_blank"
      rel="noreferrer"
      className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3 transition-colors duration-150 hover:border-primary/30 hover:bg-surface-elevated"
    >
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <IconCart />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-text-primary">Tu tienda, en movimiento.</span>
        <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-text-secondary">
          Gestioná, optimizá y hacé crecer tu negocio desde un solo lugar.
        </span>
      </span>

      <IconArrow className="h-[14px] w-[14px] shrink-0 text-text-secondary" />
    </Link>
  );
}
