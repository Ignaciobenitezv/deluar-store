import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { LockedMetricCard } from "@/features/admin/dashboard/components/locked-metric-card";
import { RankingCard } from "@/features/admin/dashboard/components/ranking-card";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Productos | DOTCOM Commerce Dashboard",
};

type AdminDashboardProductsPageProps = {
  searchParams?: Promise<{
    period?: string;
    topProductsLimit?: string;
    topProductsPage?: string;
  }>;
};

function normalizeProductsLimit(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  if ([5, 10, 25, 50].includes(parsed)) {
    return parsed;
  }

  return 5;
}

function normalizePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function barWidth(value: number, max: number) {
  if (max <= 0) {
    return "8%";
  }

  return `${Math.max(8, (value / max) * 100)}%`;
}

export default async function AdminDashboardProductsPage({
  searchParams,
}: AdminDashboardProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const topProductsLimit = normalizeProductsLimit(resolvedSearchParams?.topProductsLimit);
  const topProductsPage = normalizePage(resolvedSearchParams?.topProductsPage);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const topSold = metrics.products.topSold;
  const topRevenue = metrics.products.topRevenue;
  const totalTopProducts = topSold.length;
  const totalTopProductPages = Math.max(1, Math.ceil(totalTopProducts / topProductsLimit));
  const currentTopProductPage = Math.min(topProductsPage, totalTopProductPages);
  const topProductsStart = (currentTopProductPage - 1) * topProductsLimit;
  const topProductsEnd = topProductsStart + topProductsLimit;
  const topProductsPageItems = topSold.slice(topProductsStart, topProductsEnd);
  const maxUnits = Math.max(...topProductsPageItems.map((item) => item.unitsSold), 1);

  const buildPageHref = (nextPage: number, nextLimit = topProductsLimit) =>
    `/admin/dashboard/productos?period=${period}&topProductsLimit=${nextLimit}&topProductsPage=${nextPage}`;

  const buildLimitHref = (nextLimit: number) =>
    `/admin/dashboard/productos?period=${period}&topProductsLimit=${nextLimit}&topProductsPage=1`;

  const lowStockItems = metrics.products.lowStock;
  const outOfStockItems = metrics.products.outOfStock;
  const topProduct = topSold[0];
  const topRevenueProduct = topRevenue[0];

  return (
    <DashboardShell
      title="Productos"
      subtitle={`Vista comercial y operativa de productos. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Productos vendidos distintos"
          value={formatDashboardNumber(metrics.summary.distinctProductsSold)}
          description="Productos únicos vendidos en el período."
          tone="accent"
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatDashboardNumber(metrics.summary.unitsSold)}
          description="Unidades ligadas a órdenes pagadas."
          tone="success"
        />
        <KpiCard
          title="Bajo stock"
          value={formatDashboardNumber(metrics.summary.lowStockProducts)}
          description="Productos entre 1 y 5 unidades."
          tone="warning"
        />
        <KpiCard
          title="Sin stock"
          value={formatDashboardNumber(metrics.summary.outOfStockProducts)}
          description="Productos con stock en cero o menos."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <ChartCard
          title="Top productos más vendidos"
          description="Ranking compacto con barras proporcionales y stock actual cuando existe."
          emptyState={
            topProductsPageItems.length === 0 ? (
              <EmptyState
                title="Todavía no hay productos vendidos en este período."
                description="Cuando haya ventas, este ranking mostrará los productos con más unidades."
              />
            ) : undefined
          }
        >
          {topProductsPageItems.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Mostrando {topProductsStart + 1}-{Math.min(topProductsEnd, totalTopProducts)} de{" "}
                  {totalTopProducts}
                </div>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
                  {[5, 10, 25, 50].map((limit) => (
                    <Link
                      key={limit}
                      href={buildLimitHref(limit)}
                      className={cn(
                        "rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                        topProductsLimit === limit
                          ? "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                          : "text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {limit}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[20px] border border-slate-200/70">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Unidades vendidas
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Facturación
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsPageItems.map((product) => (
                      <tr key={product.productId} className="border-t border-slate-200/70">
                        <td className="px-4 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{product.productName}</p>
                            <p className="mt-1 text-xs text-slate-500">{product.productSlug}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{formatDashboardNumber(product.unitsSold)} uds.</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-sky-400"
                                style={{ width: barWidth(product.unitsSold, maxUnits) }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-950">
                          {formatDashboardPrice(product.revenue)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {typeof product.stock === "number" ? formatDashboardNumber(product.stock) : "N/D"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {totalTopProductPages > 1
                    ? `Página ${currentTopProductPage} de ${totalTopProductPages}`
                    : "Vista completa"}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={buildPageHref(Math.max(1, currentTopProductPage - 1))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Anterior
                  </Link>
                  <Link
                    href={buildPageHref(Math.min(totalTopProductPages, currentTopProductPage + 1))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Siguiente
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </ChartCard>

        <div className="grid gap-4">
          <RankingCard
            title="Producto más vendido"
            description="Referente comercial del período."
            items={
              topProduct
                ? [
                    {
                      id: topProduct.productId,
                      title: topProduct.productName,
                      subtitle: topProduct.productSlug,
                      value: topProduct.unitsSold,
                      secondaryValue: `${formatDashboardPrice(topProduct.revenue)} facturados`,
                      tone: "accent",
                    },
                  ]
                : []
            }
            emptyState={
              <EmptyState
                title="Sin producto líder"
                description="Todavía no hay productos vendidos en este período."
              />
            }
          />

          <RankingCard
            title="Producto con mayor facturación"
            description="Ranking por facturación histórica del período."
            items={
              topRevenueProduct
                ? [
                    {
                      id: topRevenueProduct.productId,
                      title: topRevenueProduct.productName,
                      subtitle: topRevenueProduct.productSlug,
                      value: topRevenueProduct.revenue,
                      secondaryValue: `${formatDashboardNumber(topRevenueProduct.unitsSold)} uds.`,
                      tone: "success",
                    },
                  ]
                : []
            }
            valueFormatter={formatDashboardPrice}
            emptyState={
              <EmptyState
                title="Sin producto líder en facturación"
                description="Todavía no hay facturación de productos en este período."
              />
            }
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Inventario"
          description="Alertas operativas de stock bajo y stock agotado."
        >
          <div className="grid gap-4">
            <RankingCard
              title="Productos con bajo stock"
              description="Stock entre 1 y 5 unidades."
              items={lowStockItems.map((item) => ({
                id: item.productId,
                title: item.productName,
                subtitle: item.productSlug,
                value: item.stock,
                secondaryValue: "Bajo stock",
                tone: "warning",
              }))}
              emptyState={
                <EmptyState
                  title="Sin alertas de bajo stock"
                  description="No hay productos con stock bajo en este momento."
                />
              }
            />

            <RankingCard
              title="Productos sin stock"
              description="Stock en cero o menor."
              items={outOfStockItems.map((item) => ({
                id: item.productId,
                title: item.productName,
                subtitle: item.productSlug,
                value: item.stock,
                secondaryValue: "Sin stock",
                tone: "danger",
              }))}
              emptyState={
                <EmptyState
                  title="Sin productos agotados"
                  description="No hay productos agotados en el período."
                />
              }
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Detalle por variante de producto"
          description="Módulo premium pendiente hasta persistir variante/SKU en las órdenes."
        >
          <LockedMetricCard
            title="Disponible al guardar variante/SKU en las órdenes"
            description="Hoy la información no está persistida a nivel de variante."
          />
        </ChartCard>
      </div>
    </DashboardShell>
  );
}

