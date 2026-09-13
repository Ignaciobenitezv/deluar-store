import Link from "next/link";
import type { DashboardLedgerEntry } from "@/features/admin/dashboard/server/dashboard-service";
import { formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { formatRelativeTime, homeColor, homeUi } from "./home-ui";
import { IconArrow } from "./home-icons";
import { cn } from "@/lib/utils";

/** The dot is the order's real state, not a colour per row. */
function stateTone(state: DashboardLedgerEntry["state"]) {
  switch (state) {
    case "paid":
      return homeColor.positive;
    case "pending":
      return homeColor.attention;
    case "failed":
    case "cancelled":
      return homeColor.negative;
    default:
      return "#94a3b8";
  }
}

/**
 * Deluar keeps no audit log, so this is not an activity feed pretending to be
 * one: it is the orders themselves, which is the only recent activity the
 * store actually records.
 */
export function RecentOrders({ orders, now }: { orders: DashboardLedgerEntry[]; now: Date }) {
  if (orders.length === 0) {
    return (
      <p className={cn(homeUi.note, "px-6 pb-5")}>
        Todavía no hay pedidos en los últimos 30 días.
      </p>
    );
  }

  return (
    <ul className="px-6 pb-5">
      {orders.map((order) => (
        <li key={order.id} className="border-b border-[#eef2f7] last:border-b-0">
          <Link
            href={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}
            className="group flex items-center gap-3 py-[6px] transition-colors hover:bg-white/40"
          >
            <span
              aria-hidden
              className="ml-1 h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: stateTone(order.state) }}
            />

            <span className="ml-1.5 min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-slate-950">
                {order.orderNumber}
              </span>
              <span className="mt-[2px] block truncate text-[13px] text-slate-600">
                {order.customerName} · {order.statusLabel}
              </span>
            </span>

            {/* The reference parks the amount short of the edge and lets the
                elapsed time hold the right margin. */}
            <span className="w-[104px] shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-slate-950">
              {formatDashboardPrice(order.total)}
            </span>

            <span className="w-[86px] shrink-0 text-right text-[12.5px] tabular-nums text-slate-500">
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
    <div className="grid gap-x-[14px] gap-y-[14px] px-6 pb-6 sm:grid-cols-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          /* Flat by design: the reference sets a bare icon on the surface, so
             the shortcut reads as a line of text rather than a card in a card. */
          className="group flex items-center gap-3 rounded-[9px] border border-white/55 bg-white/30 px-3.5 py-[13px] transition-colors hover:border-white/80 hover:bg-white/65"
        >
          <span aria-hidden className="shrink-0 text-slate-500">
            {action.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-slate-800">
            {action.label}
          </span>
          <IconArrow className="h-[15px] w-[15px] shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </Link>
      ))}
    </div>
  );
}

function IconCart({ className = "h-[22px] w-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 3.4h2.4l2.2 10.6h10.1l1.9-7.6H6.6" />
      <circle cx="9.4" cy="19.4" r="1.6" />
      <circle cx="17.4" cy="19.4" r="1.6" />
    </svg>
  );
}

/**
 * The banner that closes the page. It says what the Admin is for rather than
 * reporting a number, so it carries no figure that could go stale or wrong.
 */
export function StorefrontBanner() {
  return (
    <Link
      href="/"
      target="_blank"
      rel="noreferrer"
      className="group mx-6 mb-6 flex items-center gap-4 overflow-hidden rounded-[12px] border border-white/70 bg-white/30 px-5 py-4 transition-colors hover:bg-white/55"
    >
      <span aria-hidden className="shrink-0 text-slate-500">
        <IconCart />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-slate-900">
          Tu tienda, en movimiento.
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-slate-600">
          Gestioná, optimizá y hacé crecer tu negocio desde un solo lugar.
        </span>
      </span>

      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/60 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-transform group-hover:translate-x-0.5"
      >
        <IconArrow className="h-[15px] w-[15px]" />
      </span>
    </Link>
  );
}
