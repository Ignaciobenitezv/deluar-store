import type { Metadata } from "next";
import Link from "next/link";
import { markTransferOrderPaidAction } from "@/app/admin/orders/actions";
import { requireAdminSession } from "@/features/admin/auth";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import {
  getAdminOrderStatusLabel,
  getAdminPaymentMethodLabel,
  getAdminPaymentStatusLabel,
  getAdminShippingMethodLabel,
} from "@/features/admin/lib/admin-order-labels";
import { getOrderStatusBadgeClasses } from "@/features/order/status";
import type { Order } from "@/features/order/types";
import { PAYMENT_METHODS } from "@/features/payments/types";
import {
  ADMIN_ORDER_PAGE_SIZES,
  ADMIN_ORDER_PERIOD_OPTIONS,
  ADMIN_ORDER_PAYMENT_METHOD_OPTIONS,
  ADMIN_ORDER_SHIPPING_METHOD_OPTIONS,
  ADMIN_ORDER_STATUS_OPTIONS,
  getAdminOrdersPageData,
  parseAdminOrdersFilters,
} from "@/features/orders/server/order-repository";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Órdenes | DOTCOM",
};

type AdminOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatCurrency(value: number) {
  return formatDashboardPrice(value);
}

function isPendingTransfer(order: Order) {
  return (
    order.paymentMethod === PAYMENT_METHODS.TRANSFER &&
    order.status === "pending_payment" &&
    order.paymentStatus === "pending"
  );
}

function getPaymentStatusBadgeClasses(status: Order["paymentStatus"]) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "rejected":
    case "charged_back":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "refunded":
      return "border-slate-200 bg-slate-50 text-slate-800";
    case "cancelled":
    case "not_started":
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function buildOrdersHref(
  filters: ReturnType<typeof parseAdminOrdersFilters>,
  overrides: Partial<ReturnType<typeof parseAdminOrdersFilters>> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (nextFilters.q) {
    params.set("q", nextFilters.q);
  }

  if (nextFilters.status !== "all") {
    params.set("status", nextFilters.status);
  }

  if (nextFilters.paymentMethod !== "all") {
    params.set("paymentMethod", nextFilters.paymentMethod);
  }

  if (nextFilters.shippingMethod !== "all") {
    params.set("shippingMethod", nextFilters.shippingMethod);
  }

  if (nextFilters.period !== "all") {
    params.set("period", nextFilters.period);
  }

  if (nextFilters.page > 1) {
    params.set("page", String(nextFilters.page));
  }

  if (nextFilters.pageSize !== 25) {
    params.set("pageSize", String(nextFilters.pageSize));
  }

  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function getVisiblePages(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);

  return [...pages].filter((value) => value >= 1 && value <= pageCount).sort((left, right) => left - right);
}

function PaginationLink({
  href,
  children,
  active = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition",
    active
      ? dashboardUi.primaryAction
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    disabled ? "pointer-events-none opacity-40" : undefined,
  );

  if (disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{children}</span>;
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <FilterLabel>{label}</FilterLabel>
      <select
        name={name}
        defaultValue={value}
        className="w-full rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.03)] outline-none transition focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <FilterLabel>{label}</FilterLabel>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60"
      />
    </label>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M1.875 10c1.792-3.625 4.833-5.5 8.125-5.5s6.333 1.875 8.125 5.5c-1.792 3.625-4.833 5.5-8.125 5.5S3.667 13.625 1.875 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="m4.75 10.25 3.05 3.05L15.25 5.85" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ordersDetailActionClassName() {
  return cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-[18px] border px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93a6bd]/35",
    "border-[#d7e0ea] bg-[#f6f9fc] text-[#243247] shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] hover:border-[#c7d3e1] hover:bg-[#eef4f9]",
  );
}

function ordersPaidActionClassName() {
  return cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-[18px] border px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7e9f86]/35",
    "border-[#58715f] bg-[#5f7b66] text-white shadow-[0_12px_24px_rgba(56,80,60,0.14)] hover:bg-[#4f6855]",
  );
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageData = await getAdminOrdersPageData(resolvedSearchParams);
  const { filters, totalCount, pendingCount, paidCount, billingTotal, pageCount, page, pageSize, orders } = pageData;
  const hasActiveFilters =
    Boolean(filters.q) ||
    filters.status !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.shippingMethod !== "all" ||
    filters.period !== "all";
  const clearFiltersHref = buildOrdersHref(filters, {
    q: "",
    status: "all",
    paymentMethod: "all",
    shippingMethod: "all",
    period: "all",
    page: 1,
  });
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const visiblePages = getVisiblePages(page, pageCount);

  return (
    <div className={dashboardUi.contentPadding}>
      <div className={dashboardUi.shellInner}>
        <header className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className={dashboardUi.mutedLabel}>Órdenes</p>
              <h1 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-4 sm:text-[2.35rem]">
                Órdenes
              </h1>
              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500 sm:text-base sm:leading-7">
                Gestioná pedidos, pagos y entregas desde un solo lugar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold",
                  dashboardUi.softAction,
                )}
              >
                Volver al panel
              </Link>
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total órdenes"
            value={formatDashboardNumber(totalCount)}
            description="Coincidencias con los filtros actuales."
            tone="neutral"
          />
          <KpiCard
            title="Pendientes"
            value={formatDashboardNumber(pendingCount)}
            description="Esperando pago o confirmación."
            tone="warning"
          />
          <KpiCard
            title="Pagadas"
            value={formatDashboardNumber(paidCount)}
            description="Órdenes aprobadas o completadas."
            tone="success"
          />
          <KpiCard
            title="Facturación"
            value={formatCurrency(billingTotal)}
            description="Suma de órdenes pagadas en la búsqueda actual."
            tone="accent"
          />
        </section>

        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Filtros</h2>
              <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
                Buscá por orden, cliente o email y combiná estado, método de pago, envío y fecha.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={dashboardUi.pill}>{formatDashboardNumber(totalCount)} órdenes encontradas</span>
              <span className={dashboardUi.pill}>
                Página {formatDashboardNumber(page)} de {formatDashboardNumber(pageCount)}
              </span>
              <span className={dashboardUi.pill}>{formatDashboardNumber(pageSize)} por página</span>
              {hasActiveFilters ? (
                <Link
                  href={clearFiltersHref}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold",
                    dashboardUi.softAction,
                  )}
                >
                  Limpiar filtros
                </Link>
              ) : null}
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <form method="get" className="space-y-4">
              <input type="hidden" name="page" value="1" />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="md:col-span-2 xl:col-span-2">
                  <FilterInput
                    label="Buscar"
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Orden, cliente o email"
                  />
                </div>
                <FilterSelect
                  label="Estado"
                  name="status"
                  value={filters.status}
                  options={ADMIN_ORDER_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <FilterSelect
                  label="Método de pago"
                  name="paymentMethod"
                  value={filters.paymentMethod}
                  options={ADMIN_ORDER_PAYMENT_METHOD_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <FilterSelect
                  label="Tipo de envío"
                  name="shippingMethod"
                  value={filters.shippingMethod}
                  options={ADMIN_ORDER_SHIPPING_METHOD_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <FilterSelect
                  label="Fecha"
                  name="period"
                  value={filters.period}
                  options={ADMIN_ORDER_PERIOD_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <FilterSelect
                  label="Por página"
                  name="pageSize"
                  value={String(filters.pageSize)}
                  options={ADMIN_ORDER_PAGE_SIZES.map((value) => ({
                    value: String(value),
                    label: `${value} por página`,
                  }))}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">Buscá por orden, cliente o email y combiná filtros.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className={cn(
                      "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold",
                      dashboardUi.primaryAction,
                    )}
                  >
                    Buscar
                  </button>
                  {hasActiveFilters ? (
                    <Link
                      href={clearFiltersHref}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Restablecer
                    </Link>
                  ) : null}
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Listado</h2>
              <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
                Vista operativa de pedidos, pagos y envíos.
              </p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            {orders.length > 0 ? (
              <>
                <div className="space-y-3 lg:hidden">
                  {orders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">
                            #{order.orderNumber}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            ID {order.id.slice(0, 8)}
                          </p>
                        </div>
                        <p className="shrink-0 text-base font-semibold text-slate-950">
                          {formatCurrency(order.total)}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Cliente
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{order.customer.email}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Envío
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {getAdminShippingMethodLabel(order.shippingMethod)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.shippingCost === 0 ? "Gratis" : formatCurrency(order.shippingCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Método
                          </p>
                          <p className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            {getAdminPaymentMethodLabel(order.paymentMethod)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Fecha
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {formatDashboardDateTime(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={cn("inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", getOrderStatusBadgeClasses(order.status))}>
                          {getAdminOrderStatusLabel(order.status)}
                        </span>
                        <span className={cn("inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", getPaymentStatusBadgeClasses(order.paymentStatus))}>
                          {getAdminPaymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className={ordersDetailActionClassName()}
                        >
                          <EyeIcon className="h-4 w-4 shrink-0" />
                          Ver detalle
                        </Link>
                        {isPendingTransfer(order) ? (
                          <form action={markTransferOrderPaidAction} className="w-full">
                            <input type="hidden" name="orderId" value={order.id} />
                            <button
                              type="submit"
                              className={ordersPaidActionClassName()}
                            >
                              <CheckIcon className="h-4 w-4 shrink-0" />
                              Marcar como pagada
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-[1240px] table-fixed border-collapse text-sm">
                    <colgroup>
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead className="bg-slate-50/80 text-left">
                      <tr className="border-b border-slate-200/70">
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Orden
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Envío
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Método
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-200/60 transition hover:bg-slate-50/60">
                          <td className="px-4 py-4 align-top">
                            <div className="min-w-0">
                              <p className="font-semibold tracking-[-0.02em] text-slate-950">#{order.orderNumber}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                ID {order.id.slice(0, 8)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {order.customer.firstName} {order.customer.lastName}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">{order.customer.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-slate-950">{formatCurrency(order.total)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {getAdminShippingMethodLabel(order.shippingMethod)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {order.shippingCost === 0 ? "Gratis" : formatCurrency(order.shippingCost)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              {getAdminPaymentMethodLabel(order.paymentMethod)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-2">
                              <span
                                className={cn(
                                  "inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                                  getOrderStatusBadgeClasses(order.status),
                                )}
                              >
                                {getAdminOrderStatusLabel(order.status)}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                                  getPaymentStatusBadgeClasses(order.paymentStatus),
                                )}
                              >
                                {getAdminPaymentStatusLabel(order.paymentStatus)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-medium text-slate-900">{formatDashboardDateTime(order.createdAt)}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="min-w-[11.5rem] space-y-2">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className={ordersDetailActionClassName()}
                              >
                                <EyeIcon className="h-4 w-4 shrink-0" />
                                Ver detalle
                              </Link>
                              {isPendingTransfer(order) ? (
                                <form action={markTransferOrderPaidAction}>
                                  <input type="hidden" name="orderId" value={order.id} />
                                  <button
                                    type="submit"
                                    className={ordersPaidActionClassName()}
                                  >
                                    <CheckIcon className="h-4 w-4 shrink-0" />
                                    Marcar como pagada
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">No hay órdenes con esos filtros.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Probá limpiar la búsqueda o cambiar el estado, método de pago o fecha.
                </p>
                {hasActiveFilters ? (
                  <div className="mt-4">
                    <Link
                      href={clearFiltersHref}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold",
                        dashboardUi.softAction,
                      )}
                    >
                      Limpiar filtros
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/70 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-slate-500">
                Mostrando {formatDashboardNumber(startItem)}-{formatDashboardNumber(endItem)} de{" "}
                {formatDashboardNumber(totalCount)} órdenes.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <PaginationLink
                  href={buildOrdersHref(filters, { page: Math.max(1, page - 1) })}
                  disabled={page <= 1}
                >
                  Anterior
                </PaginationLink>

                {visiblePages.map((pageNumber, index) => {
                  const previousPage = visiblePages[index - 1];
                  const showEllipsis = typeof previousPage === "number" && pageNumber - previousPage > 1;

                  return (
                    <span key={pageNumber} className="flex items-center gap-2">
                      {showEllipsis ? <span className="px-1 text-sm text-slate-400">&</span> : null}
                      <PaginationLink
                        href={buildOrdersHref(filters, { page: pageNumber })}
                        active={pageNumber === page}
                      >
                        {formatDashboardNumber(pageNumber)}
                      </PaginationLink>
                    </span>
                  );
                })}

                <PaginationLink
                  href={buildOrdersHref(filters, { page: Math.min(pageCount, page + 1) })}
                  disabled={page >= pageCount}
                >
                  Siguiente
                </PaginationLink>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
