import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { RankingCard } from "@/features/admin/dashboard/components/ranking-card";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ubicación | DOTCOM Commerce Dashboard",
};

type AdminDashboardLocationPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function percentage(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (part / total) * 100;
}

export default async function AdminDashboardLocationPage({ searchParams }: AdminDashboardLocationPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const provinces = metrics.location.provinces;
  const cities = metrics.location.cities;
  const totalRevenue = provinces.reduce((accumulator, item) => accumulator + item.revenue, 0);
  const mobileProvinces = provinces.slice(0, 3);
  const hiddenMobileProvinces = Math.max(0, provinces.length - mobileProvinces.length);
  const mobileCities = cities.slice(0, 3);
  const hiddenMobileCities = Math.max(0, cities.length - mobileCities.length);

  const topProvinceRevenue = provinces[0];
  const topCityRevenue = cities[0];

  return (
    <DashboardShell
      title="Ubicación"
      subtitle={`Rendimiento comercial por provincia y localidad. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard title="Provincias con ventas" value={formatDashboardNumber(provinces.length)} description="Provincias con al menos una venta." tone="accent" />
        <KpiCard title="Localidades con ventas" value={formatDashboardNumber(cities.length)} description="Localidades con ventas registradas." tone="success" />
        <KpiCard title="Provincia líder" value={topProvinceRevenue ? topProvinceRevenue.province : "-"} description={topProvinceRevenue ? formatDashboardPrice(topProvinceRevenue.revenue) : "Sin datos"} tone="warning" />
        <KpiCard title="Localidad líder" value={topCityRevenue ? topCityRevenue.city : "-"} description={topCityRevenue ? `${topCityRevenue.province} · ${formatDashboardPrice(topCityRevenue.revenue)}` : "Sin datos"} tone="neutral" />
      </section>

      {provinces.length === 0 ? (
        <EmptyState
          title="Todavía no hay ventas con ubicación registrada en este período."
          description="Cuando existan pedidos con provincia y localidad, la vista mostrará rankings y concentración comercial."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Top provincias por facturación" description="Facturación, pedidos y participación sobre el total.">
            <div className="space-y-3 sm:hidden">
              {mobileProvinces.map((item) => (
                <div key={item.province} className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.province}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDashboardNumber(item.orders)} pedidos · {formatDashboardPercent(percentage(item.revenue, totalRevenue))}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{formatDashboardPrice(item.revenue)}</p>
                  </div>
                </div>
              ))}
              {hiddenMobileProvinces > 0 ? (
                <p className="px-1 text-xs text-slate-500">Ver detalle en desktop · +{hiddenMobileProvinces} provincias más</p>
              ) : null}
            </div>

            <div className="hidden overflow-hidden rounded-[20px] border border-slate-200/70 sm:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Provincia</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturación</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">%</th>
                  </tr>
                </thead>
                <tbody>
                  {provinces.map((item) => (
                    <tr key={item.province} className="border-t border-slate-200/70">
                      <td className="px-4 py-4 font-medium text-slate-900">{item.province}</td>
                      <td className="px-4 py-4 font-semibold text-slate-950">{formatDashboardPrice(item.revenue)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(item.orders)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardPercent(percentage(item.revenue, totalRevenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <RankingCard
            title="Top provincias por pedidos"
            description="Cantidad de pedidos y facturación secundaria."
            items={provinces.map((item) => ({
              id: item.province,
              title: item.province,
              subtitle: `${formatDashboardPrice(item.revenue)} facturados`,
              value: item.orders,
              secondaryValue: formatDashboardPrice(item.revenue),
              tone: "accent",
            }))}
            emptyState={<EmptyState title="Sin provincias para mostrar" description="Todavía no hay ventas con ubicación registrada en este período." />}
          />
        </div>
      )}

      <ChartCard title="Top localidades" description="Localidades con mayor concentración comercial.">
        {cities.length > 0 ? (
          <>
            <div className="space-y-3 sm:hidden">
              {mobileCities.map((item) => (
                <div key={`${item.province}-${item.city}`} className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.city}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.province}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{formatDashboardPrice(item.revenue)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDashboardNumber(item.orders)} pedidos</span>
                    <span>{formatDashboardPercent(percentage(item.revenue, totalRevenue))}</span>
                  </div>
                </div>
              ))}
              {hiddenMobileCities > 0 ? (
                <p className="px-1 text-xs text-slate-500">Ver detalle en desktop · +{hiddenMobileCities} localidades más</p>
              ) : null}
            </div>

            <div className="hidden overflow-hidden rounded-[20px] border border-slate-200/70 sm:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Localidad</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Provincia</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((item) => (
                    <tr key={`${item.province}-${item.city}`} className="border-t border-slate-200/70">
                      <td className="px-4 py-4 font-medium text-slate-900">{item.city}</td>
                      <td className="px-4 py-4 text-slate-600">{item.province}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(item.orders)}</td>
                      <td className="px-4 py-4 text-slate-950 font-semibold">{formatDashboardPrice(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            title="Todavía no hay ventas con ubicación registrada en este período."
            description="Cuando aparezcan pedidos con provincia y localidad, esta tabla mostrará las localidades líderes."
          />
        )}
      </ChartCard>
    </DashboardShell>
  );
}
