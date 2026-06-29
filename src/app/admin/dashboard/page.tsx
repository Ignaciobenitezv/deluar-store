import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { RankingCard } from "@/features/admin/dashboard/components/ranking-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPrice,
  formatDashboardShortDate,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOTCOM Commerce Dashboard",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function barWidth(value: number, max: number) {
  if (max <= 0) {
    return "8%";
  }

  return `${Math.max(8, (value / max) * 100)}%`;
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const dailySeries = metrics.sales.daily.slice(-7);
  const maxRevenue = Math.max(...dailySeries.map((item) => item.revenue), 1);
  const maxOrders = Math.max(...dailySeries.map((item) => item.paidOrders), 1);
  const maxUnits = Math.max(...dailySeries.map((item) => item.unitsSold), 1);
  const topProducts = metrics.products.topSold.slice(0, 5);
  const quickLinks = [
    { href: "/admin/dashboard/ventas", label: "Ventas" },
    { href: "/admin/dashboard/productos", label: "Productos" },
    { href: "/admin/dashboard/clientes", label: "Clientes" },
    { href: "/admin/dashboard/pagos", label: "Pagos" },
    { href: "/admin/dashboard/envios", label: "Envíos" },
  ];

  return (
    <DashboardShell
      title="Resumen"
      subtitle={`Portada ejecutiva de DOTCOM Commerce Dashboard. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Solo órdenes pagadas o aprobadas."
          tone="success"
        />
        <KpiCard
          title="Pedidos pagados"
          value={formatDashboardNumber(metrics.summary.paidOrders)}
          description="Órdenes incluidas en la facturación."
          tone="accent"
        />
        <KpiCard
          title="Ticket promedio"
          value={formatDashboardPrice(metrics.summary.averageTicket)}
          description="Promedio sobre órdenes pagadas."
          tone="warning"
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatDashboardNumber(metrics.summary.unitsSold)}
          description="Unidades ligadas a órdenes pagadas."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <ChartCard
          title="Evolución compacta"
          description="Últimos 7 días visibles para evitar una portada larga."
        >
          <div className="space-y-3">
            {dailySeries.map((item) => (
              <div key={item.date} className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDashboardShortDate(item.date)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDashboardNumber(item.paidOrders)} pedidos · {formatDashboardNumber(item.unitsSold)} uds.
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-950">
                    {formatDashboardPrice(item.revenue)}
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <span>Facturación</span>
                      <span>{formatDashboardPrice(item.revenue)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: barWidth(item.revenue, maxRevenue) }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <span>Pedidos</span>
                      <span>{formatDashboardNumber(item.paidOrders)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: barWidth(item.paidOrders, maxOrders) }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <span>Unidades</span>
                      <span>{formatDashboardNumber(item.unitsSold)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: barWidth(item.unitsSold, maxUnits) }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {metrics.sales.daily.length > dailySeries.length ? (
              <p className="text-xs text-slate-500">
                Resumen compacto. El resto del período se prioriza en vistas específicas.
              </p>
            ) : null}
          </div>
        </ChartCard>

        <ChartCard title="Alertas operativas" description="Señales rápidas para la gestión diaria.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StatBadge
              label="Pedidos pendientes"
              value={formatDashboardNumber(metrics.alerts.pendingPaymentOrders)}
              tone="warning"
            />
            <StatBadge
              label="Pedidos pagados sin cerrar"
              value={formatDashboardNumber(metrics.alerts.paidPendingPreparationOrders)}
              tone="approved"
            />
            <StatBadge
              label="Stock bajo"
              value={formatDashboardNumber(metrics.summary.lowStockProducts)}
              tone="warning"
            />
            <StatBadge
              label="Sin stock"
              value={formatDashboardNumber(metrics.summary.outOfStockProducts)}
              tone="failed"
            />
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <RankingCard
          title="Top productos"
          description="Ranking reducido para la portada ejecutiva."
          items={topProducts.map((product) => ({
            id: product.productId,
            title: product.productName,
            subtitle: product.productSlug,
            value: product.unitsSold,
            secondaryValue: formatDashboardPrice(product.revenue),
            tone: "accent",
          }))}
          valueFormatter={formatDashboardNumber}
          emptyState={
            <EmptyState
              title="Todavía no hay productos vendidos en este período."
              description="Cuando haya ventas, aquí aparecerán los productos líderes."
            />
          }
        />

        <ChartCard title="Accesos rápidos" description="Saltos directos a las vistas operativas.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
      </div>
    </DashboardShell>
  );
}

