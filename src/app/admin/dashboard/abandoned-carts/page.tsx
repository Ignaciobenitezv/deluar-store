import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";
import type { AnalyticsCartStatus as AnalyticsCartStatusEnum } from "@/generated/prisma/client";
import {
  formatAbandonedCartDateTime,
  formatAbandonedCartDuration,
  getAbandonedCartsPageData,
  normalizeAbandonedCartsQuery,
} from "@/features/admin/analytics/server/abandoned-carts-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carritos abandonados | Panel de comercio de DOTCOM",
};

type AdminDashboardAbandonedCartsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStageLabel(value: "all" | "CART_ABANDONED" | "CHECKOUT_ABANDONED") {
  switch (value) {
    case "CART_ABANDONED":
      return "Carrito abandonado";
    case "CHECKOUT_ABANDONED":
      return "Checkout abandonado";
    default:
      return "Todos";
  }
}

function getStageBadgeClasses(value: AnalyticsCartStatusEnum) {
  switch (value) {
    case "CHECKOUT_ABANDONED":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "CART_ABANDONED":
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function getStatusAfterBadgeClasses(value: string) {
  switch (value) {
    case "Comprado después":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Orden creada":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function buildAbandonedCartsHref(
  current: ReturnType<typeof normalizeAbandonedCartsQuery>,
  overrides: Partial<ReturnType<typeof normalizeAbandonedCartsQuery>> = {},
) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();

  params.set("period", next.period);

  if (next.stage !== "all") {
    params.set("stage", next.stage);
  }

  if (next.source !== "all") {
    params.set("source", next.source);
  }

  if (next.campaign !== "all") {
    params.set("campaign", next.campaign);
  }

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  if (next.pageSize !== 25) {
    params.set("pageSize", String(next.pageSize));
  }

  const query = params.toString();
  return query ? `/admin/dashboard/abandoned-carts?${query}` : "/admin/dashboard/abandoned-carts";
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
      ? "border-[#314158] bg-[#314158] text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)]"
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

export default async function AdminDashboardAbandonedCartsPage({ searchParams }: AdminDashboardAbandonedCartsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period) ? resolvedSearchParams.period[0] : resolvedSearchParams.period,
  );
  const query = normalizeAbandonedCartsQuery({
    ...resolvedSearchParams,
    period: parsedPeriod,
  });
  const data = await getAbandonedCartsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());

  const stageOptions = [
    { value: "all", label: "Todos" },
    { value: "CART_ABANDONED", label: "Carrito abandonado" },
    { value: "CHECKOUT_ABANDONED", label: "Checkout abandonado" },
  ];
  const sourceOptions = [{ value: "all", label: "Todas" }, ...data.sourceOptions.map((value) => ({ value, label: value }))];
  const campaignOptions = [{ value: "all", label: "Todas" }, ...data.campaignOptions.map((value) => ({ value, label: value }))];
  const stageLabel = getStageLabel(query.stage);

  const summarySubtitle = `Vista operativa de carritos abandonados. Período activo: ${DASHBOARD_PERIODS[query.period].label}.`;

  return (
    <DashboardShell title="Carritos abandonados" subtitle={summarySubtitle} lastUpdated={lastUpdated}>
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Carritos abandonados"
          value={formatDashboardNumber(data.totals.cartAbandonedCount)}
          description="status = CART_ABANDONED."
          tone="warning"
        />
        <KpiCard
          title="Checkouts abandonados"
          value={formatDashboardNumber(data.totals.checkoutAbandonedCount)}
          description="status = CHECKOUT_ABANDONED."
          tone="accent"
        />
        <KpiCard
          title="Valor total abandonado"
          value={formatDashboardPrice(data.totals.totalValue)}
          description="Suma de subtotal sobre abandonos filtrados."
          tone="success"
        />
        <KpiCard
          title="Ticket promedio abandonado"
          value={formatDashboardPrice(data.totals.averageTicket)}
          description="Promedio de subtotal por carrito."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard title="Filtros" description="Filtrado server-side sobre abandonedAt y atributos de sesión." className="min-w-0">
          <form method="get" className="grid gap-3 lg:grid-cols-6">
            <input type="hidden" name="period" value={query.period} />
            <input type="hidden" name="page" value="1" />

            <FilterSelect
              label="Etapa"
              name="stage"
              value={query.stage}
              options={stageOptions}
            />
            <FilterSelect
              label="Fuente"
              name="source"
              value={query.source}
              options={sourceOptions}
            />
            <FilterSelect
              label="Campaña"
              name="campaign"
              value={query.campaign}
              options={campaignOptions}
            />
            <FilterSelect
              label="Tamaño"
              name="pageSize"
              value={String(query.pageSize)}
              options={[
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
            />
            <FilterInput
              label="Búsqueda"
              name="q"
              defaultValue={query.q}
              placeholder="cartId, sessionId, visitorId o producto"
            />
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[16px] border border-[#314158] bg-[#314158] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)] transition hover:bg-[#3b4f69]"
              >
                Aplicar
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {stageLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatDashboardNumber(data.pageSize)} por página
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatDashboardNumber(data.totals.totalCount)} resultados
            </span>
          </div>
        </ChartCard>

        <ChartCard title="Resumen" description="Datos complementarios." className="min-w-0">
          <div className="grid gap-2 sm:grid-cols-2">
            <StatBadge label="Unidades abandonadas" value={formatDashboardNumber(data.totals.totalUnits)} tone="neutral" />
            <StatBadge
              label="Tiempo medio hasta abandono"
              value={formatAbandonedCartDuration(data.totals.averageTimeMinutes)}
              tone="warning"
            />
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Listado de carritos abandonados"
        description="Ordenado por abandonedAt descendente. El período filtra por abandonedAt."
        className="min-w-0"
        emptyState={
          data.carts.length === 0 ? (
            <EmptyState
              title="No hay carritos abandonados en este período."
              description="Probá cambiar el período o quitar filtros."
            />
          ) : undefined
        }
      >
        {data.carts.length > 0 ? (
          <>
            <div className="hidden overflow-hidden rounded-[20px] border border-slate-200/70 sm:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fecha</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Etapa</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Productos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Unidades</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Subtotal</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tiempo</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fuente</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Campaña</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estado posterior</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.carts.map((cart) => (
                      <tr key={cart.cartId} className="border-t border-slate-200/70 align-top">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{formatAbandonedCartDateTime(cart.abandonedAt)}</p>
                            <p className="mt-1 text-xs text-slate-500">{cart.cartId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                              getStageBadgeClasses(cart.status),
                            )}
                          >
                            {cart.stageLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="max-w-[320px] text-sm font-medium text-slate-900">{cart.productSummary}</p>
                          <p className="mt-1 text-xs text-slate-500">{cart.productDetailsLabel}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">{formatDashboardNumber(cart.itemCount)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-950">
                          {formatDashboardPrice(cart.subtotal)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">{cart.timeToAbandonLabel}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-900">{cart.sourceLabel}</p>
                          <p className="mt-1 text-xs text-slate-500">{cart.referrerLabel}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-700">{cart.campaignLabel}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", getStatusAfterBadgeClasses(cart.statusAfterLabel))}>
                            {cart.statusAfterLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/dashboard/abandoned-carts/${cart.cartId}`}
                            className="inline-flex rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:hidden">
              {data.carts.map((cart) => (
                <article key={cart.cartId} className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{formatAbandonedCartDateTime(cart.abandonedAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">{cart.cartId}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        getStageBadgeClasses(cart.status),
                      )}
                    >
                      {cart.stageLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Productos</p>
                      <p className="text-sm font-medium text-slate-900">{cart.productSummary}</p>
                      <p className="text-xs text-slate-500">{cart.productDetailsLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unidades</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(cart.itemCount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Subtotal</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(cart.subtotal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tiempo</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{cart.timeToAbandonLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estado</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{cart.statusAfterLabel}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fuente</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{cart.sourceLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Campaña</p>
                        <p className="mt-1 text-sm text-slate-700">{cart.campaignLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <Link
                      href={`/admin/dashboard/abandoned-carts/${cart.cartId}`}
                      className="inline-flex rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {data.pageCount > 1 ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Mostrando {formatDashboardNumber((data.page - 1) * data.pageSize + 1)}-
                  {formatDashboardNumber(Math.min(data.page * data.pageSize, data.totals.totalCount))} de{" "}
                  {formatDashboardNumber(data.totals.totalCount)}
                </p>
                <div className="flex items-center gap-2">
                  <PaginationLink
                    href={buildAbandonedCartsHref(query, { page: Math.max(1, data.page - 1) })}
                    disabled={data.page <= 1}
                  >
                    Anterior
                  </PaginationLink>
                  {getVisiblePages(data.page, data.pageCount).map((page) => (
                    <PaginationLink
                      key={page}
                      href={buildAbandonedCartsHref(query, { page })}
                      active={page === data.page}
                    >
                      {page}
                    </PaginationLink>
                  ))}
                  <PaginationLink
                    href={buildAbandonedCartsHref(query, { page: Math.min(data.pageCount, data.page + 1) })}
                    disabled={data.page >= data.pageCount}
                  >
                    Siguiente
                  </PaginationLink>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </ChartCard>
    </DashboardShell>
  );
}
