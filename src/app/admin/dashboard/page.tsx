import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardChartEmpty } from "@/features/admin/dashboard/components/charts/dashboard-chart-empty";
import { DashboardRevenueChart } from "@/features/admin/dashboard/components/charts/dashboard-revenue-chart";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { normalizeDashboardPeriodValue } from "@/features/admin/dashboard/server/dashboard-service";
import { formatDashboardDateTime, formatDashboardNumber, formatDashboardPercent, formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { getExecutiveSummaryPageData } from "@/features/admin/dashboard/server/executive-summary-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resumen | DOTCOM",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const summary = await getExecutiveSummaryPageData(period);
  const lastUpdated = formatDashboardDateTime(new Date());
  const periodLabelMap: Record<"today" | "7d" | "30d" | "90d", string> = {
    today: "Hoy",
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    "90d": "Últimos 90 días",
  };

  const quickLinks = [
    { href: "/admin/dashboard/ventas", label: "Ventas" },
    { href: "/admin/dashboard/productos", label: "Análisis de productos" },
    { href: "/admin/dashboard/conversion", label: "Conversión" },
    { href: "/admin/dashboard/adquisicion", label: "Adquisición" },
    { href: "/admin/dashboard/clientes", label: "Clientes" },
    { href: "/admin/dashboard/carritos", label: "Carritos" },
  ];

  const primaryKpis = [
    {
      title: "Facturación",
      value: formatDashboardPrice(summary.dashboard.summary.billingTotal),
      description: "Solo órdenes pagadas o aprobadas.",
      tone: "success" as const,
    },
    {
      title: "Pedidos / compras",
      value: formatDashboardNumber(summary.dashboard.summary.paidOrders),
      description: "Órdenes incluidas en la facturación.",
      tone: "accent" as const,
    },
    {
      title: "Conversión",
      value: formatDashboardPercent(summary.conversion.summary.conversionRate),
      description: "Compras sobre sesiones del período.",
      tone: "neutral" as const,
    },
    {
      title: "Ticket promedio",
      value: formatDashboardPrice(summary.dashboard.summary.averageTicket),
      description: "Promedio sobre órdenes pagadas.",
      tone: "warning" as const,
    },
  ];

  const secondaryMetrics = [
    { label: "Sesiones", value: formatDashboardNumber(summary.conversion.summary.sessions), tone: "neutral" as const },
    { label: "Add to cart", value: formatDashboardNumber(summary.conversion.activity.addToCartSessions), tone: "approved" as const },
    { label: "Carritos abandonados", value: formatDashboardNumber(summary.conversion.activity.cartAbandoned), tone: "failed" as const },
    { label: "Compradores únicos", value: formatDashboardNumber(summary.customers.summary.uniqueBuyers), tone: "neutral" as const },
  ];

  const funnelStages = summary.conversion.funnel.filter((stage) => stage.count > 0 || stage.key === "sessions");
  const topProductByUnits = summary.products.charts.topSold[0] ?? null;
  const topProductByRevenue = summary.products.products[0] ?? null;
  const topProductByAddToCart = summary.products.charts.topAdded[0] ?? null;
  const topCampaign = summary.acquisition.campaigns[0] ?? null;

  const productHighlights = [
    {
      label: "Más vendido",
      name: topProductByUnits?.productName ?? null,
      metricLabel: "Unidades",
      metricValue: topProductByUnits ? formatDashboardNumber(topProductByUnits.value) : "—",
      detail: null,
    },
    {
      label: "Mayor facturación",
      name: topProductByRevenue?.productName ?? null,
      metricLabel: "Facturación",
      metricValue: topProductByRevenue ? formatDashboardPrice(topProductByRevenue.revenue) : "—",
      detail: topProductByRevenue ? `${formatDashboardNumber(topProductByRevenue.unitsSold)} unidades` : null,
    },
    {
      label: "Más agregado al carrito",
      name: topProductByAddToCart?.productName ?? null,
      metricLabel: "Add to cart",
      metricValue: topProductByAddToCart ? formatDashboardNumber(topProductByAddToCart.value) : "—",
      detail: null,
    },
  ];

  return (
    <DashboardShell
      title="Resumen"
      subtitle={`Visión ejecutiva del rendimiento del ecommerce. Período activo: ${periodLabelMap[period]}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {primaryKpis.map((item) => (
          <KpiCard key={item.title} title={item.title} value={item.value} description={item.description} tone={item.tone} />
        ))}
      </section>

      <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {secondaryMetrics.map((item) => (
          <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </section>

      <ChartCard title="Evolución del negocio" description="Facturación y pedidos dentro del período activo." className="min-w-0">
        <DashboardRevenueChart data={summary.dashboard.sales.daily} />
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Funnel resumido"
          description="Lectura ejecutiva de sesiones, producto visto, add to cart, checkout y compra."
          className="min-w-0"
        >
          {summary.conversion.summary.sessions > 0 && funnelStages.length > 0 ? (
            <div className="space-y-3">
              {funnelStages.map((stage, index) => {
                const width = index === 0 ? 100 : Math.max(0, stage.shareOfSessions);

                return (
                  <div key={stage.key} className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{stage.label}</p>
                        <p className="mt-1 text-[13px] leading-5 text-slate-500">
                          {index === 0 ? "Base del embudo" : `Ca\u00edda vs. etapa anterior: ${formatDashboardPercent(stage.dropOffFromPrevious)}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{formatDashboardNumber(stage.count)}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {index === 0 ? "100% base" : `${formatDashboardPercent(stage.shareOfSessions)} del total`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#314158]"
                        style={{ width: `${Math.max(0, Math.min(width, 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Conversión global</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">Sesiones que terminaron en compra</p>
                  </div>
                  <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                    {formatDashboardPercent(summary.conversion.summary.conversionRate)}
                  </p>
                </div>
              </div>

              <Link href="/admin/dashboard/conversion" className={`${dashboardUi.softAction} inline-flex rounded-full border px-4 py-2 text-sm font-medium`}>
                Ver conversión
              </Link>
            </div>
          ) : (
            <DashboardChartEmpty
              title="No hay sesiones para resumir el funnel."
              description="Cuando entre tráfico, acá se verá la caída principal entre etapas."
              compact
            />
          )}
        </ChartCard>

        <ChartCard title="Productos" description="Lectura ejecutiva del producto que mejor está respondiendo." className="min-w-0">
          {productHighlights.some((item) => item.name) ? (
            <div className="space-y-3">
              {productHighlights.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-slate-200/70 bg-slate-50 p-3 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950">{item.name ?? "Sin producto"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900">
                      {item.metricLabel}: {item.metricValue}
                    </span>
                    {item.detail ? (
                      <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">{item.detail}</span>
                    ) : null}
                  </div>
                </div>
              ))}

              <Link href="/admin/dashboard/productos" className={`${dashboardUi.softAction} inline-flex rounded-full border px-4 py-2 text-sm font-medium`}>
                Ver análisis de productos
              </Link>
            </div>
          ) : (
            <DashboardChartEmpty
              title="No hay productos suficientes para resumir."
              description="Cuando haya actividad, acá aparecerán los destacados del período."
              compact
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Adquisición" description="Fuentes y campañas con mejor desempeño en el período." className="min-w-0">
          {summary.acquisition.summary.sessions > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatBadge label="Más tráfico" value={summary.acquisition.highlights.traffic?.label ?? "Sin datos"} tone="neutral" />
                <StatBadge label="Más facturación" value={summary.acquisition.highlights.revenue?.label ?? "Sin datos"} tone="approved" />
                <StatBadge label="Campaña destacada" value={topCampaign?.campaign ?? "Sin campaña"} tone="warning" />
                <StatBadge label="Sesiones" value={formatDashboardNumber(summary.acquisition.summary.sessions)} tone="neutral" />
              </div>
              <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{summary.acquisition.highlights.conversion?.label ?? "Mejor conversión"}</p>
                <p className="mt-1">
                  {summary.acquisition.highlights.conversion?.value ?? "Sin muestra suficiente para rankear conversión."}
                </p>
              </div>
              <Link href="/admin/dashboard/adquisicion" className={`${dashboardUi.softAction} inline-flex rounded-full border px-4 py-2 text-sm font-medium`}>
                Ver adquisición
              </Link>
            </div>
          ) : (
            <DashboardChartEmpty
              title="No hay sesiones para resumir adquisición."
              description="Cuando haya tráfico con sesión, acá se mostrarán fuentes y campañas."
              compact
            />
          )}
        </ChartCard>

        <ChartCard title="Clientes" description="Lectura ejecutiva de compradores únicos y recurrencia." className="min-w-0">
          {summary.customers.summary.uniqueBuyers > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatBadge label="Compradores únicos" value={formatDashboardNumber(summary.customers.summary.uniqueBuyers)} tone="neutral" />
                <StatBadge label="Clientes nuevos" value={formatDashboardNumber(summary.customers.summary.newCustomers)} tone="approved" />
                <StatBadge label="Clientes recurrentes" value={formatDashboardNumber(summary.customers.summary.recurrentCustomers)} tone="approved" />
                <StatBadge label="Tasa de recompra" value={formatDashboardPercent(summary.customers.summary.repurchaseRate)} tone="warning" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>Nuevos</span>
                  <span>{formatDashboardPercent(summary.customers.split.newCustomerShare)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#7cc6a3]" style={{ width: `${Math.min(100, summary.customers.split.newCustomerShare)}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>Recurrentes</span>
                  <span>{formatDashboardPercent(summary.customers.split.recurrentCustomerShare)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#4f7cac]" style={{ width: `${Math.min(100, summary.customers.split.recurrentCustomerShare)}%` }} />
                </div>
              </div>

              <Link href="/admin/dashboard/clientes" className={`${dashboardUi.softAction} inline-flex rounded-full border px-4 py-2 text-sm font-medium`}>
                Ver clientes
              </Link>
            </div>
          ) : (
            <DashboardChartEmpty
              title="No hay compradores en el período."
              description="Cuando empiecen a cerrar compras, acá aparecerá la lectura ejecutiva de clientes."
              compact
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Carritos abandonados" description="Lectura compacta del abandono del período." className="min-w-0">
          {summary.conversion.activity.cartAbandoned > 0 || summary.conversion.activity.checkoutAbandoned > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatBadge label="Carritos abandonados" value={formatDashboardNumber(summary.conversion.activity.cartAbandoned)} tone="warning" />
                <StatBadge label="Checkouts abandonados" value={formatDashboardNumber(summary.conversion.activity.checkoutAbandoned)} tone="failed" />
                <StatBadge label="Valor abandonado carrito" value={formatDashboardPrice(summary.conversion.abandonment.cart.value)} tone="neutral" />
                <StatBadge label="Valor abandonado checkout" value={formatDashboardPrice(summary.conversion.abandonment.checkout.value)} tone="neutral" />
              </div>
              <Link href="/admin/dashboard/carritos" className={`${dashboardUi.softAction} inline-flex rounded-full border px-4 py-2 text-sm font-medium`}>
                Ver carritos abandonados
              </Link>
            </div>
          ) : (
            <DashboardChartEmpty
              title="No hay abandonos para este período."
              description="Si aparece abandono, aquí verás el volumen y su valor potencial."
              compact
            />
          )}
        </ChartCard>

        <ChartCard title="Requiere atención" description="Señales determinísticas basadas en la actividad real del período." className="min-w-0">
          {summary.insights.length > 0 ? (
            <div className="space-y-3">
              {summary.insights.map((insight) => (
                <div key={insight.label} className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {insight.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insight.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <DashboardChartEmpty
              title="No hay señales relevantes."
              description="Con más actividad aparecerán alertas ejecutivas más útiles."
              compact
            />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Accesos rápidos" description="Saltos directos a las vistas ejecutivas y operativas.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4 transition-colors hover:bg-slate-50"
            >
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">Abrir módulo</p>
            </Link>
          ))}
        </div>
      </ChartCard>
    </DashboardShell>
  );
}
