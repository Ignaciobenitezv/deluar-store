import Link from "next/link";
import type { Metadata } from "next";
import { DashboardRevenueChart } from "@/features/admin/dashboard/components/charts/dashboard-revenue-chart";
import { DashboardChartEmpty } from "@/features/admin/dashboard/components/charts/dashboard-chart-empty";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import { normalizeDashboardPeriodValue } from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { getExecutiveSummaryPageData } from "@/features/admin/dashboard/server/executive-summary-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resumen | DELUAR",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{ period?: string }>;
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconRevenue() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6v10M8.5 8.5c0-1.1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.7-5 2.2-5 5.2 0 1.5 1.5 2 3 2s2.5-.7 2.5-2" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 9V7.5A3.5 3.5 0 0 1 11 4a3.5 3.5 0 0 1 3.5 3.5V9" />
      <path d="M4 9h14L16.5 18H5.5L4 9Z" />
    </svg>
  );
}

function IconConversion() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5.5h16l-5 7v5.5l-6-1.5v-4L3 5.5Z" />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4.5" width="14" height="13" rx="2.5" />
      <path d="M8 10h6M8 13.5h6M8 17h4" />
    </svg>
  );
}

// ── Local primitives ──────────────────────────────────────────────────────────

type KpiCardProps = {
  icon: React.ReactNode;
  iconAccent?: boolean;
  label: string;
  value: string;
  description?: string;
};

function KpiCard({ icon, iconAccent = false, label, value, description }: KpiCardProps) {
  return (
    <article className="flex flex-col rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.05)]">
      <div
        className={
          iconAccent
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f3ede8] text-[#9d7d62]"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-slate-50 text-slate-500"
        }
      >
        {icon}
      </div>
      <p className="mt-4 text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-slate-700">{label}</p>
      {description ? (
        <p className="mt-0.5 text-[12px] leading-4 text-slate-400">{description}</p>
      ) : null}
    </article>
  );
}

type SecondaryMetricProps = {
  label: string;
  value: string;
};

function SecondaryMetric({ label, value }: SecondaryMetricProps) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-[1.5rem] font-semibold leading-none tracking-[-0.03em] text-slate-900">
        {value}
      </p>
    </div>
  );
}

type PanelProps = {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
};

function Panel({ title, description, action, children, className }: PanelProps) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.05)]${className ? ` ${className}` : ""}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{title}</p>
          {description ? (
            <p className="mt-0.5 text-[12px] text-slate-400">{description}</p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-[12px] font-medium text-[#9d7d62] transition-colors hover:text-[#7a6249]"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

type DataRowProps = {
  label: string;
  value: string;
  sub?: string;
};

function DataRow({ label, value, sub }: DataRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <p className="min-w-0 truncate text-[13px] text-slate-600">{label}</p>
      <div className="shrink-0 text-right">
        <p className="text-[13px] font-semibold text-slate-900">{value}</p>
        {sub ? <p className="text-[11px] text-slate-400">{sub}</p> : null}
      </div>
    </div>
  );
}

function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-[12px] text-slate-400">{message}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const summary = await getExecutiveSummaryPageData(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const funnelStages = summary.conversion.funnel.filter(
    (stage) => stage.count > 0 || stage.key === "sessions",
  );

  const topProductByUnits = summary.products.charts.topSold[0] ?? null;
  const topProductByRevenue = summary.products.products[0] ?? null;
  const topProductByAddToCart = summary.products.charts.topAdded[0] ?? null;
  const topCampaign = summary.acquisition.campaigns[0] ?? null;

  const quickLinks = [
    { href: "/admin/dashboard/ventas", label: "Ventas" },
    { href: "/admin/dashboard/productos", label: "Productos" },
    { href: "/admin/dashboard/conversion", label: "Conversión" },
    { href: "/admin/dashboard/adquisicion", label: "Adquisición" },
    { href: "/admin/dashboard/clientes", label: "Clientes" },
    { href: "/admin/dashboard/abandoned-carts", label: "Carritos" },
  ];

  return (
    <div className="flex min-h-screen flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-5 border-b border-slate-200/70 bg-white/95 px-6 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-medium text-slate-400">Estadísticas</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">Resumen</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] text-slate-400 lg:block">{lastUpdated}</span>
          <DateRangeFilter topBar />
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">

          {/* Page heading */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
              Análisis del negocio
            </h1>
          </div>

          {/* ── KPI cards (4-col) ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<IconRevenue />}
              iconAccent
              label="Facturación"
              value={formatDashboardPrice(summary.dashboard.summary.billingTotal)}
              description="Solo órdenes pagadas o aprobadas."
            />
            <KpiCard
              icon={<IconOrders />}
              label="Pedidos"
              value={formatDashboardNumber(summary.dashboard.summary.paidOrders)}
              description="Órdenes incluidas en la facturación."
            />
            <KpiCard
              icon={<IconConversion />}
              label="Conversión"
              value={formatDashboardPercent(summary.conversion.summary.conversionRate)}
              description="Compras sobre sesiones del período."
            />
            <KpiCard
              icon={<IconTicket />}
              label="Ticket promedio"
              value={formatDashboardPrice(summary.dashboard.summary.averageTicket)}
              description="Promedio sobre órdenes pagadas."
            />
          </div>

          {/* ── Secondary metrics (4 small cards) ───────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SecondaryMetric
              label="Sesiones"
              value={formatDashboardNumber(summary.conversion.summary.sessions)}
            />
            <SecondaryMetric
              label="Add to cart"
              value={formatDashboardNumber(summary.conversion.activity.addToCartSessions)}
            />
            <SecondaryMetric
              label="Carritos abandonados"
              value={formatDashboardNumber(summary.conversion.activity.cartAbandoned)}
            />
            <SecondaryMetric
              label="Compradores únicos"
              value={formatDashboardNumber(summary.customers.summary.uniqueBuyers)}
            />
          </div>

          {/* ── Main analytics row (65 / 35) ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.52fr]">

            {/* LEFT – Revenue & orders chart */}
            <Panel
              title="Evolución del negocio"
              description="Facturación y pedidos del período."
            >
              <DashboardRevenueChart data={summary.dashboard.sales.daily} />
            </Panel>

            {/* RIGHT – Conversion summary */}
            <Panel
              title="Conversión"
              description="Funnel del período."
              action={{ href: "/admin/dashboard/conversion", label: "Ver detalle" }}
            >
              {summary.conversion.summary.sessions > 0 ? (
                <div className="flex h-full flex-col">
                  {/* Featured number */}
                  <div className="mb-4 border-b border-slate-100 pb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Tasa global
                    </p>
                    <p className="mt-2 text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
                      {formatDashboardPercent(summary.conversion.summary.conversionRate)}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      {formatDashboardNumber(summary.conversion.summary.sessions)} sesiones · {formatDashboardNumber(summary.dashboard.summary.paidOrders)} compras
                    </p>
                  </div>

                  {/* Funnel stages */}
                  <div className="flex-1 space-y-0">
                    {funnelStages.map((stage, index) => (
                      <div key={stage.key} className="border-b border-slate-100 py-3 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-slate-800">{stage.label}</p>
                          <div className="shrink-0 text-right">
                            <p className="text-[13px] font-semibold text-slate-900">
                              {formatDashboardNumber(stage.count)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {index === 0 ? "100%" : formatDashboardPercent(stage.shareOfSessions)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#314158]"
                            style={{
                              width: `${Math.max(0, Math.min(index === 0 ? 100 : stage.shareOfSessions, 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <PanelEmpty message="Sin sesiones en el período." />
              )}
            </Panel>
          </div>

          {/* ── Secondary grid (3-col) ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* Productos */}
            <Panel
              title="Productos"
              description="Líderes del período."
              action={{ href: "/admin/dashboard/productos", label: "Ver análisis" }}
            >
              {(topProductByUnits || topProductByRevenue || topProductByAddToCart) ? (
                <div>
                  {[
                    {
                      label: "Más vendido",
                      name: topProductByUnits?.productName ?? "—",
                      value: topProductByUnits ? `${formatDashboardNumber(topProductByUnits.value)} u.` : "—",
                    },
                    {
                      label: "Mayor facturación",
                      name: topProductByRevenue?.productName ?? "—",
                      value: topProductByRevenue ? formatDashboardPrice(topProductByRevenue.revenue) : "—",
                    },
                    {
                      label: "Más al carrito",
                      name: topProductByAddToCart?.productName ?? "—",
                      value: topProductByAddToCart ? formatDashboardNumber(topProductByAddToCart.value) : "—",
                    },
                  ].map((item) => (
                    <div key={item.label} className="border-b border-slate-100 py-3 last:border-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-400">
                        {item.label}
                      </p>
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-[13px] font-medium text-slate-800">
                          {item.name}
                        </p>
                        <p className="shrink-0 text-[12px] font-semibold text-slate-600">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PanelEmpty message="Sin actividad." />
              )}
            </Panel>

            {/* Adquisición */}
            <Panel
              title="Adquisición"
              description="Fuentes del período."
              action={{ href: "/admin/dashboard/adquisicion", label: "Ver fuentes" }}
            >
              {summary.acquisition.summary.sessions > 0 ? (
                <div>
                  <DataRow
                    label="Más tráfico"
                    value={summary.acquisition.highlights.traffic?.label ?? "—"}
                  />
                  <DataRow
                    label="Más facturación"
                    value={summary.acquisition.highlights.revenue?.label ?? "—"}
                  />
                  {topCampaign ? (
                    <DataRow
                      label="Campaña destacada"
                      value={topCampaign.campaign ?? "—"}
                    />
                  ) : null}
                  <DataRow
                    label="Sesiones totales"
                    value={formatDashboardNumber(summary.acquisition.summary.sessions)}
                  />
                  {summary.acquisition.highlights.conversion ? (
                    <DataRow
                      label={summary.acquisition.highlights.conversion.label}
                      value={summary.acquisition.highlights.conversion.value}
                    />
                  ) : null}
                </div>
              ) : (
                <PanelEmpty message="Sin sesiones en el período." />
              )}
            </Panel>

            {/* Clientes */}
            <Panel
              title="Clientes"
              description="Compradores del período."
              action={{ href: "/admin/dashboard/clientes", label: "Ver clientes" }}
            >
              {summary.customers.summary.uniqueBuyers > 0 ? (
                <div>
                  <DataRow
                    label="Compradores únicos"
                    value={formatDashboardNumber(summary.customers.summary.uniqueBuyers)}
                  />
                  <DataRow
                    label="Clientes nuevos"
                    value={formatDashboardNumber(summary.customers.summary.newCustomers)}
                  />
                  <DataRow
                    label="Clientes recurrentes"
                    value={formatDashboardNumber(summary.customers.summary.recurrentCustomers)}
                  />
                  <DataRow
                    label="Tasa de recompra"
                    value={formatDashboardPercent(summary.customers.summary.repurchaseRate)}
                  />
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-slate-500">Nuevos</span>
                      <span className="text-[12px] font-semibold text-slate-700">
                        {formatDashboardPercent(summary.customers.split.newCustomerShare)}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#7cc6a3]"
                        style={{ width: `${Math.min(100, summary.customers.split.newCustomerShare)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-slate-500">Recurrentes</span>
                      <span className="text-[12px] font-semibold text-slate-700">
                        {formatDashboardPercent(summary.customers.split.recurrentCustomerShare)}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#4f7cac]"
                        style={{
                          width: `${Math.min(100, summary.customers.split.recurrentCustomerShare)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <PanelEmpty message="Sin compradores en el período." />
              )}
            </Panel>
          </div>

          {/* ── Bottom row ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* Carritos abandonados – spans 2 */}
            <Panel
              title="Carritos abandonados"
              description="Abandono del período."
              action={{ href: "/admin/dashboard/abandoned-carts", label: "Ver carritos" }}
              className="md:col-span-2"
            >
              {summary.conversion.activity.cartAbandoned > 0 ||
              summary.conversion.activity.checkoutAbandoned > 0 ? (
                <div className="grid grid-cols-2 gap-x-8">
                  <DataRow
                    label="Carritos abandonados"
                    value={formatDashboardNumber(summary.conversion.activity.cartAbandoned)}
                  />
                  <DataRow
                    label="Valor abandonado"
                    value={formatDashboardPrice(summary.conversion.abandonment.cart.value)}
                  />
                  <DataRow
                    label="Checkouts abandonados"
                    value={formatDashboardNumber(summary.conversion.activity.checkoutAbandoned)}
                  />
                  <DataRow
                    label="Valor checkout"
                    value={formatDashboardPrice(summary.conversion.abandonment.checkout.value)}
                  />
                </div>
              ) : (
                <PanelEmpty message="Sin abandono significativo en el período." />
              )}
            </Panel>

            {/* Señales – 1 col */}
            <Panel title="Señales" description="Alertas del período.">
              {summary.insights.length > 0 ? (
                <div>
                  {summary.insights.slice(0, 4).map((insight) => (
                    <div key={insight.label} className="border-b border-slate-100 py-3 last:border-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-400">
                        {insight.label}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-[1.45] text-slate-700">{insight.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanelEmpty message="Sin alertas para destacar." />
              )}
            </Panel>
          </div>

          {/* ── Quick links ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-300/30 pb-2 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Vistas
            </span>
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
