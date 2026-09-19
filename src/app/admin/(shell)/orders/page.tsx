import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/features/admin/auth";
import { MarkOrderPaidButton } from "@/app/admin/(shell)/orders/mark-paid-button";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
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

/** This page's own payment-status badge — distinct from the shared, storefront-facing
 * getOrderStatusBadgeClasses, which this file also uses but never edits. */
function getPaymentStatusBadgeClasses(status: Order["paymentStatus"]) {
  switch (status) {
    case "approved":
      return "border-success/25 bg-success-soft text-success";
    case "pending":
      return "border-warning/25 bg-warning-soft text-warning";
    case "rejected":
    case "charged_back":
      return "border-danger/25 bg-danger-soft text-danger";
    case "refunded":
      return "border-border bg-surface-elevated text-text-secondary";
    case "cancelled":
    case "not_started":
    default:
      return "border-border bg-surface text-text-secondary";
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

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{children}</span>;
}

const filterFieldClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

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
      <select name={name} defaultValue={value} className={filterFieldClass}>
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
      <input type="search" name={name} defaultValue={defaultValue} placeholder={placeholder} className={filterFieldClass} />
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

function ordersDetailActionClassName() {
  return "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap text-text-primary transition-colors duration-150 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
}

function ordersMobileDetailActionClassName() {
  return "inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-[12px] font-semibold whitespace-nowrap text-text-primary transition-colors duration-150 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
}

function MobileOrderRow({ order }: { order: Order }) {
  const pendingTransfer = isPendingTransfer(order);

  return (
    <article className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.015em] text-text-primary">#{order.orderNumber}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{order.customer.email}</p>
        </div>

        <p className="shrink-0 text-sm font-semibold text-text-primary">{formatCurrency(order.total)}</p>
      </div>

      <p className="mt-3 text-sm leading-6 text-text-secondary">
        {getAdminShippingMethodLabel(order.shippingMethod)} · {getAdminPaymentMethodLabel(order.paymentMethod)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
            getOrderStatusBadgeClasses(order.status),
          )}
        >
          {getAdminOrderStatusLabel(order.status)}
        </span>
        <span
          className={cn(
            "inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
            getPaymentStatusBadgeClasses(order.paymentStatus),
          )}
        >
          {getAdminPaymentStatusLabel(order.paymentStatus)}
        </span>
      </div>

      {pendingTransfer ? (
        <div className="mt-3 flex justify-end">
          <MarkOrderPaidButton orderId={order.id} size="sm" />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-text-secondary">{formatDashboardDateTime(order.createdAt)}</p>
        <Link href={`/admin/orders/${order.id}`} className={ordersMobileDetailActionClassName()}>
          <EyeIcon className="h-4 w-4 shrink-0" />
          Ver detalle
        </Link>
      </div>
    </article>
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
  const activeFilterCount = [
    Boolean(filters.q),
    filters.status !== "all",
    filters.paymentMethod !== "all",
    filters.shippingMethod !== "all",
    filters.period !== "all",
  ].filter(Boolean).length;

  const mobileView = (
    <section className="space-y-4 lg:hidden">
      <header className="space-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.25rem] font-semibold tracking-[-0.015em] text-text-primary">Órdenes</h1>
          <p className="mt-1 text-[12px] leading-5 text-text-secondary">
            Gestioná pedidos, pagos y entregas desde un solo lugar.
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-3">
          <Link href="/admin" className={cn("inline-flex h-9 items-center justify-center rounded-xl border px-3 text-[12px] font-semibold transition-colors duration-150", dashboardUi.softAction)}>
            Volver al panel
          </Link>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-[12px] font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5">
        <KpiCard title="Total órdenes" value={formatDashboardNumber(totalCount)} description="Coincidencias con los filtros actuales." tone="neutral" />
        <KpiCard title="Pendientes" value={formatDashboardNumber(pendingCount)} description="Esperando pago o confirmación." tone="warning" />
        <KpiCard title="Pagadas" value={formatDashboardNumber(paidCount)} description="Órdenes aprobadas o completadas." tone="success" />
        <KpiCard title="Facturación" value={formatCurrency(billingTotal)} description="Suma de órdenes pagadas en la búsqueda actual." tone="accent" />
      </section>

      <section className="space-y-3 border-t border-border pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>Búsqueda y filtros</p>
            <p className="mt-1 text-sm text-text-secondary">Orden, cliente, pago y envío.</p>
          </div>

          <div className="min-w-0 text-right text-xs text-text-secondary">
            {totalCount > 0 ? `${formatDashboardNumber(totalCount)} pedidos` : "Sin pedidos"}
          </div>
        </div>

        <form method="get" className="space-y-3">
          <input type="hidden" name="page" value="1" />

          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-[minmax(0,1fr)_auto] min-[390px]:items-end">
            <label className="block min-w-0 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Buscar</span>
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="Orden, cliente o email"
                className={filterFieldClass}
              />
            </label>

            <button
              type="submit"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-xl border px-4 text-[12px] font-semibold whitespace-nowrap min-[390px]:w-auto",
                dashboardUi.primaryAction,
              )}
            >
              Buscar
            </button>
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-lg border border-border bg-surface px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                {formatDashboardNumber(activeFilterCount)} filtros
              </span>
              <Link
                href={clearFiltersHref}
                className={cn("inline-flex h-7 items-center rounded-lg border px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]", dashboardUi.softAction)}
              >
                Limpiar
              </Link>
            </div>
          ) : null}

          <details className="rounded-xl border border-border bg-surface-elevated px-3 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
              <span>Filtros</span>
            </summary>

            <div className="mt-3 grid gap-3">
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
          </details>
        </form>
      </section>

      <section className="border-t border-border pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>Órdenes</p>
            <h2 className="mt-1 text-sm font-semibold tracking-[-0.01em] text-text-primary">
              {formatDashboardNumber(totalCount)} pedidos
            </h2>
          </div>
          {pageCount > 1 ? (
            <p className="text-xs text-text-secondary">
              Página {formatDashboardNumber(page)} de {formatDashboardNumber(pageCount)}
            </p>
          ) : null}
        </div>

        {orders.length > 0 ? (
          <div className="mt-3 divide-y divide-border">
            {orders.map((order) => (
              <MobileOrderRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center">
            <p className="text-sm font-semibold tracking-[-0.01em] text-text-primary">No hay órdenes con esos filtros.</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Probá limpiar la búsqueda o cambiar el estado, método de pago o fecha.
            </p>
            {hasActiveFilters ? (
              <div className="mt-4">
                <Link
                  href={clearFiltersHref}
                  className={cn("inline-flex items-center justify-center rounded-xl border px-3 py-2 text-[12px] font-semibold", dashboardUi.softAction)}
                >
                  Limpiar filtros
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {totalCount > 0 ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <p className="min-w-0 whitespace-nowrap text-center text-[11px] leading-4 text-text-secondary">
              {formatDashboardNumber(startItem)}-{formatDashboardNumber(endItem)} de {formatDashboardNumber(totalCount)} | Página {formatDashboardNumber(page)} de {formatDashboardNumber(pageCount)}
            </p>

            <AdminPagination
              page={page}
              totalPages={pageCount}
              buildHref={(nextPage) => buildOrdersHref(filters, { page: nextPage })}
              className="justify-center"
            />
          </div>
        ) : null}
      </section>
    </section>
  );

  return (
    <div className={dashboardUi.contentPadding}>
      <div className={dashboardUi.shellInner}>
        <div className="lg:hidden">{mobileView}</div>
        <div className="hidden lg:block">
          <header className="rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-3xl">
                <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.625rem]">
                  Órdenes
                </h1>
                <p className="mt-1.5 max-w-2xl text-[12.5px] leading-5 text-text-secondary">
                  Gestioná pedidos, pagos y entregas desde un solo lugar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/admin" className={cn("inline-flex h-9 items-center justify-center rounded-xl border px-3.5 text-[12.5px] font-semibold", dashboardUi.softAction)}>
                  Volver al panel
                </Link>
                <form action="/api/admin/logout" method="post">
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
                  >
                    Salir
                  </button>
                </form>
              </div>
            </div>
          </header>

          <section className="mt-3 grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4 sm:mt-4">
            <KpiCard title="Total órdenes" value={formatDashboardNumber(totalCount)} description="Coincidencias con los filtros actuales." tone="neutral" />
            <KpiCard title="Pendientes" value={formatDashboardNumber(pendingCount)} description="Esperando pago o confirmación." tone="warning" />
            <KpiCard title="Pagadas" value={formatDashboardNumber(paidCount)} description="Órdenes aprobadas o completadas." tone="success" />
            <KpiCard title="Facturación" value={formatCurrency(billingTotal)} description="Suma de órdenes pagadas en la búsqueda actual." tone="accent" />
          </section>

          <section className={cn(dashboardUi.card, "mt-3 sm:mt-4")}>
            <div className={dashboardUi.cardHeader}>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Filtros</h2>
                <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">
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
                    className={cn("inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-semibold", dashboardUi.softAction)}
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
                    <FilterInput label="Buscar" name="q" defaultValue={filters.q} placeholder="Orden, cliente o email" />
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
                  <p className="text-xs leading-5 text-text-secondary">Buscá por orden, cliente o email y combiná filtros.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className={cn("inline-flex h-9 items-center justify-center rounded-xl border px-4 text-sm font-semibold", dashboardUi.primaryAction)}
                    >
                      Buscar
                    </button>
                    {hasActiveFilters ? (
                      <Link
                        href={clearFiltersHref}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
                      >
                        Restablecer
                      </Link>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          </section>

          <section className={cn(dashboardUi.card, "mt-3 sm:mt-4")}>
            <div className={dashboardUi.cardHeader}>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Listado</h2>
                <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">
                  Vista operativa de pedidos, pagos y envíos.
                </p>
              </div>
            </div>

            <div className={dashboardUi.cardBody}>
              {orders.length > 0 ? (
                <>
                  <div className="space-y-3 lg:hidden">
                    {orders.map((order) => (
                      <article key={order.id} className="rounded-xl border border-border bg-surface px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold tracking-[-0.01em] text-text-primary">#{order.orderNumber}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-secondary">
                              ID {order.id.slice(0, 8)}
                            </p>
                          </div>
                          <p className="shrink-0 text-base font-semibold text-text-primary">{formatCurrency(order.total)}</p>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Cliente</p>
                            <p className="mt-1 text-sm font-medium text-text-primary">
                              {order.customer.firstName} {order.customer.lastName}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">{order.customer.email}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Envío</p>
                            <p className="mt-1 text-sm font-medium text-text-primary">
                              {getAdminShippingMethodLabel(order.shippingMethod)}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {order.shippingCost === 0 ? "Gratis" : formatCurrency(order.shippingCost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Método</p>
                            <p className="mt-1 inline-flex rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-text-primary">
                              {getAdminPaymentMethodLabel(order.paymentMethod)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Fecha</p>
                            <p className="mt-1 text-sm font-medium text-text-primary">{formatDashboardDateTime(order.createdAt)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className={cn("inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", getOrderStatusBadgeClasses(order.status))}>
                            {getAdminOrderStatusLabel(order.status)}
                          </span>
                          <span className={cn("inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", getPaymentStatusBadgeClasses(order.paymentStatus))}>
                            {getAdminPaymentStatusLabel(order.paymentStatus)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <Link href={`/admin/orders/${order.id}`} className={ordersDetailActionClassName()}>
                            <EyeIcon className="h-4 w-4 shrink-0" />
                            Ver detalle
                          </Link>
                          {isPendingTransfer(order) ? <MarkOrderPaidButton orderId={order.id} /> : null}
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
                      <thead className="bg-surface-elevated text-left">
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Orden</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Cliente</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Total</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Envío</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Método</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Estado</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Fecha</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-t border-border transition-colors duration-150 hover:bg-surface-elevated">
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-0">
                                <p className="font-semibold tracking-[-0.01em] text-text-primary">#{order.orderNumber}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-secondary">
                                  ID {order.id.slice(0, 8)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary">
                                  {order.customer.firstName} {order.customer.lastName}
                                </p>
                                <p className="mt-1 truncate text-xs text-text-secondary">{order.customer.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-text-primary">{formatCurrency(order.total)}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary">{getAdminShippingMethodLabel(order.shippingMethod)}</p>
                                <p className="mt-1 text-xs text-text-secondary">
                                  {order.shippingCost === 0 ? "Gratis" : formatCurrency(order.shippingCost)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <span className="inline-flex rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-primary">
                                {getAdminPaymentMethodLabel(order.paymentMethod)}
                              </span>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={cn(
                                    "inline-flex w-fit rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                    getOrderStatusBadgeClasses(order.status),
                                  )}
                                >
                                  {getAdminOrderStatusLabel(order.status)}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex w-fit rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                    getPaymentStatusBadgeClasses(order.paymentStatus),
                                  )}
                                >
                                  {getAdminPaymentStatusLabel(order.paymentStatus)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm font-medium text-text-primary">{formatDashboardDateTime(order.createdAt)}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-[11.5rem] space-y-2">
                                <Link href={`/admin/orders/${order.id}`} className={ordersDetailActionClassName()}>
                                  <EyeIcon className="h-4 w-4 shrink-0" />
                                  Ver detalle
                                </Link>
                                {isPendingTransfer(order) ? <MarkOrderPaidButton orderId={order.id} /> : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center">
                  <p className="text-sm font-semibold tracking-[-0.01em] text-text-primary">No hay órdenes con esos filtros.</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Probá limpiar la búsqueda o cambiar el estado, método de pago o fecha.
                  </p>
                  {hasActiveFilters ? (
                    <div className="mt-4">
                      <Link
                        href={clearFiltersHref}
                        className={cn("inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold", dashboardUi.softAction)}
                      >
                        Limpiar filtros
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-text-secondary">
                  Mostrando {formatDashboardNumber(startItem)}-{formatDashboardNumber(endItem)} de{" "}
                  {formatDashboardNumber(totalCount)} órdenes.
                </p>

                <AdminPagination
                  page={page}
                  totalPages={pageCount}
                  buildHref={(nextPage) => buildOrdersHref(filters, { page: nextPage })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
