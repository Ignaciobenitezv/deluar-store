import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardLocationChart } from "@/features/admin/dashboard/components/charts/dashboard-location-chart";
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
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ubicación | Panel de comercio de DOTCOM",
};

type AdminDashboardLocationPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardLocationPage({ searchParams }: AdminDashboardLocationPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const provinces = metrics.location.provinces;
  const cities = metrics.location.cities;
  const topProvinceRevenue = provinces[0];
  const topCityRevenue = cities[0];

  return (
    <DashboardShell
      title="Ubicación"
      subtitle={`Rendimiento comercial por provincia y localidad. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Provincias con ventas"
          value={formatDashboardNumber(provinces.length)}
          description="Provincias con al menos una venta."
          tone="accent"
        />
        <KpiCard
          title="Localidades con ventas"
          value={formatDashboardNumber(cities.length)}
          description="Localidades con ventas registradas."
          tone="success"
        />
        <KpiCard
          title="Provincia líder"
          value={topProvinceRevenue ? topProvinceRevenue.province : "-"}
          description={topProvinceRevenue ? formatDashboardPrice(topProvinceRevenue.revenue) : "Sin datos"}
          tone="warning"
        />
        <KpiCard
          title="Localidad líder"
          value={topCityRevenue ? topCityRevenue.city : "-"}
          description={topCityRevenue ? `${topCityRevenue.province} · ${formatDashboardPrice(topCityRevenue.revenue)}` : "Sin datos"}
          tone="neutral"
        />
      </section>

      {provinces.length === 0 ? (
        <EmptyState
          title="Todavía no hay ventas con ubicación registrada en este período."
          description="Cuando existan pedidos con provincia y localidad, la vista mostrará rankings y concentración comercial."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
          <ChartCard title="Top provincias" description="Facturación y pedidos por provincia.">
            <DashboardLocationChart data={provinces} />
          </ChartCard>

          <div className="grid gap-4">
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

            <ChartCard title="Top localidades" description="Localidades con mayor concentración comercial.">
              {cities.length > 0 ? (
                <div className="space-y-3">
                  {cities.slice(0, 8).map((item) => (
                    <div key={`${item.province}-${item.city}`} className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.city}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.province}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-950">{formatDashboardPrice(item.revenue)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDashboardNumber(item.orders)} pedidos</span>
                        <span>{formatDashboardPrice(item.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Todavía no hay ventas con ubicación registrada en este período."
                  description="Cuando aparezcan pedidos con provincia y localidad, esta vista mostrará las localidades líderes."
                />
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
