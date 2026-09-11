import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
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
  title: "Carritos abandonados | DELUAR",
};

type AdminDashboardAbandonedCartsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStageLabel(value: "all" | "CART_ABANDONED" | "CHECKOUT_ABANDONED") {
  switch (value) {
    case "CART_ABANDONED": return "Carrito abandonado";
    case "CHECKOUT_ABANDONED": return "Checkout abandonado";
    default: return "Todos";
  }
}

function getStageBadgeClasses(value: AnalyticsCartStatusEnum) {
  switch (value) {
    case "CHECKOUT_ABANDONED": return "border-sky-200 bg-sky-50 text-sky-800";
    case "CART_ABANDONED":
    default: return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function getStatusAfterBadgeClasses(value: string) {
  switch (value) {
    case "Comprado después": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Orden creada": return "border-sky-200 bg-sky-50 text-sky-800";
    default: return "border-[#e8e5e1] bg-white text-slate-600";
  }
}

function buildHref(current: ReturnType<typeof normalizeAbandonedCartsQuery>, overrides: Partial<ReturnType<typeof normalizeAbandonedCartsQuery>> = {}) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  params.set("period", next.period);
  if (next.stage !== "all") params.set("stage", next.stage);
  if (next.source !== "all") params.set("source", next.source);
  if (next.campaign !== "all") params.set("campaign", next.campaign);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 25) params.set("pageSize", String(next.pageSize));
  const query = params.toString();
  return query ? `/admin/dashboard/abandoned-carts?${query}` : "/admin/dashboard/abandoned-carts";
}

function getVisiblePages(page: number, pageCount: number) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  return [...pages].filter((v) => v >= 1 && v <= pageCount).sort((a, b) => a - b);
}

function PaginationLink({ href, children, active = false, disabled = false }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  const cls = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[13px] font-semibold transition",
    active ? "border-slate-900 bg-slate-900 text-white" : "border-[#e8e5e1] bg-white text-slate-700 hover:bg-slate-50",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) return <span className={cls}>{children}</span>;
  return <Link href={href} className={cls} aria-current={active ? "page" : undefined}>{children}</Link>;
}

function IconCart() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l1.5 9h9.5l1.5-6H7" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}
function IconCheckout() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="16" height="12" rx="2" /><path d="M3 9h16" />
    </svg>
  );
}
function IconValue() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6v10M8.5 8.5c0-1.1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.7-5 2.2-5 5.2 0 1.5 1.5 2 3 2s2.5-.7 2.5-2" />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4.5" width="14" height="13" rx="2.5" /><path d="M8 10h6M8 13.5h4" />
    </svg>
  );
}

export default async function AdminDashboardAbandonedCartsPage({ searchParams }: AdminDashboardAbandonedCartsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period) ? resolvedSearchParams.period[0] : resolvedSearchParams.period,
  );
  const query = normalizeAbandonedCartsQuery({ ...resolvedSearchParams, period: parsedPeriod });
  const data = await getAbandonedCartsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());

  const stageOptions = [
    { value: "all", label: "Todos" },
    { value: "CART_ABANDONED", label: "Carrito abandonado" },
    { value: "CHECKOUT_ABANDONED", label: "Checkout abandonado" },
  ];
  const sourceOptions = [{ value: "all", label: "Todas" }, ...data.sourceOptions.map((v) => ({ value: v, label: v }))];
  const campaignOptions = [{ value: "all", label: "Todas" }, ...data.campaignOptions.map((v) => ({ value: v, label: v }))];
  const stageLabel = getStageLabel(query.stage);
  const periodLabel = DASHBOARD_PERIODS[query.period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Carritos abandonados"
      title="Carritos abandonados"
      subtitle={`Vista operativa de carritos abandonados. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Carritos abandonados"
          value={formatDashboardNumber(data.totals.cartAbandonedCount)}
          description="Con status CART_ABANDONED."
          icon={<IconCart />}
          tone="warning"
        />
        <KpiCard
          title="Checkouts abandonados"
          value={formatDashboardNumber(data.totals.checkoutAbandonedCount)}
          description="Con status CHECKOUT_ABANDONED."
          icon={<IconCheckout />}
          tone="accent"
        />
        <KpiCard
          title="Valor total abandonado"
          value={formatDashboardPrice(data.totals.totalValue)}
          description="Suma del subtotal sobre abandonos."
          icon={<IconValue />}
          tone="danger"
        />
        <KpiCard
          title="Ticket promedio"
          value={formatDashboardPrice(data.totals.averageTicket)}
          description="Promedio de subtotal por carrito."
          icon={<IconTicket />}
          tone="neutral"
        />
      </div>

      {/* Filters + Summary */}
      <div className="grid gap-4 xl:grid-cols-[1fr_0.4fr]">
        {/* Filters */}
        <ChartCard title="Filtros" description="Filtrá por etapa, fuente, campaña o búsqueda libre.">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <input type="hidden" name="period" value={query.period} />
            <input type="hidden" name="page" value="1" />

            {/* Etapa */}
            <label className="block min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Etapa</span>
              <select name="stage" defaultValue={query.stage}
                className="w-full rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60">
                {stageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            {/* Fuente */}
            <label className="block min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Fuente</span>
              <select name="source" defaultValue={query.source}
                className="w-full rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60">
                {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            {/* Campaña */}
            <label className="block min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Campaña</span>
              <select name="campaign" defaultValue={query.campaign}
                className="w-full rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60">
                {campaignOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            {/* Tamaño */}
            <label className="block min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Por página</span>
              <select name="pageSize" defaultValue={String(query.pageSize)}
                className="w-full rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60">
                {["25", "50", "100"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            {/* Búsqueda */}
            <label className="block min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Búsqueda</span>
              <input type="search" name="q" defaultValue={query.q} placeholder="cartId, sesión, producto…"
                className="w-full rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60" />
            </label>

            <div className="flex items-end">
              <button type="submit"
                className="w-full rounded-[8px] border border-slate-900 bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800">
                Aplicar
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[stageLabel, `${formatDashboardNumber(data.pageSize)} por página`, `${formatDashboardNumber(data.totals.totalCount)} resultados`].map((tag) => (
              <span key={tag} className="rounded-full border border-[#e8e5e1] bg-[#faf9f7] px-3 py-1 text-[11px] font-semibold text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Summary */}
        <ChartCard title="Resumen" description="Datos complementarios del período.">
          {[
            { label: "Total abandonos", value: formatDashboardNumber(data.totals.totalCount) },
            { label: "Unidades abandonadas", value: formatDashboardNumber(data.totals.totalUnits) },
            { label: "Tiempo medio hasta abandono", value: formatAbandonedCartDuration(data.totals.averageTimeMinutes) },
            { label: "Valor total", value: formatDashboardPrice(data.totals.totalValue) },
            { label: "Ticket promedio", value: formatDashboardPrice(data.totals.averageTicket) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
              <p className="text-[13px] text-slate-500">{row.label}</p>
              <p className="text-[13px] font-semibold text-slate-900">{row.value}</p>
            </div>
          ))}
        </ChartCard>
      </div>

      {/* Cart list */}
      <ChartCard
        title="Lista de carritos abandonados"
        description="Ordenado por fecha de abandono descendente."
        className="min-w-0"
      >
        {data.carts.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-[10px] border border-[#e8e5e1] sm:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      {["Fecha", "Etapa", "Productos", "Unidades", "Subtotal", "Tiempo", "Fuente", "Campaña", "Estado posterior", "Acción"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.carts.map((cart) => (
                      <tr key={cart.cartId} className="border-t border-[#e8e5e1] align-top">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-[13px] font-medium text-slate-900">{formatAbandonedCartDateTime(cart.abandonedAt)}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{cart.cartId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold", getStageBadgeClasses(cart.status))}>
                            {cart.stageLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-[280px] text-[13px] font-medium text-slate-900">{cart.productSummary}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{cart.productDetailsLabel}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(cart.itemCount)}</td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{formatDashboardPrice(cart.subtotal)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{cart.timeToAbandonLabel}</td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-slate-900">{cart.sourceLabel}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{cart.referrerLabel}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{cart.campaignLabel}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold", getStatusAfterBadgeClasses(cart.statusAfterLabel))}>
                            {cart.statusAfterLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/dashboard/abandoned-carts/${cart.cartId}`}
                            className="inline-flex rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
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

            {/* Mobile cards */}
            <div className="grid gap-3 sm:hidden">
              {data.carts.map((cart) => (
                <article key={cart.cartId} className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-950">{formatAbandonedCartDateTime(cart.abandonedAt)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{cart.cartId}</p>
                    </div>
                    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold", getStageBadgeClasses(cart.status))}>
                      {cart.stageLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["Subtotal", formatDashboardPrice(cart.subtotal)],
                      ["Unidades", formatDashboardNumber(cart.itemCount)],
                      ["Tiempo", cart.timeToAbandonLabel],
                      ["Estado posterior", cart.statusAfterLabel],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                        <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link
                      href={`/admin/dashboard/abandoned-carts/${cart.cartId}`}
                      className="inline-flex rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {data.pageCount > 1 ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] text-slate-400">
                  Mostrando {formatDashboardNumber((data.page - 1) * data.pageSize + 1)}–{formatDashboardNumber(Math.min(data.page * data.pageSize, data.totals.totalCount))} de {formatDashboardNumber(data.totals.totalCount)}
                </p>
                <div className="flex items-center gap-1.5">
                  <PaginationLink href={buildHref(query, { page: Math.max(1, data.page - 1) })} disabled={data.page <= 1}>Anterior</PaginationLink>
                  {getVisiblePages(data.page, data.pageCount).map((page) => (
                    <PaginationLink key={page} href={buildHref(query, { page })} active={page === data.page}>{page}</PaginationLink>
                  ))}
                  <PaginationLink href={buildHref(query, { page: Math.min(data.pageCount, data.page + 1) })} disabled={data.page >= data.pageCount}>Siguiente</PaginationLink>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e8e5e1] bg-[#faf9f7]">
              <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5 text-slate-400" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h2l1.5 9h9.5l1.5-6H7" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" />
              </svg>
            </div>
            <p className="mt-3 text-[14px] font-semibold text-slate-800">No hay carritos abandonados en este período</p>
            <p className="mt-1 text-[13px] text-slate-400">Probá cambiar el período o quitar filtros.</p>
          </div>
        )}
      </ChartCard>
    </DashboardSubpageShell>
  );
}
