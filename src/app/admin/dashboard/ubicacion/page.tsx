import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardLocationChart } from "@/features/admin/dashboard/components/charts/dashboard-location-chart";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
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
  title: "Ubicación | DELUAR",
};

type AdminDashboardLocationPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function IconProvinces() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3.5C8 3.5 5.5 6 5.5 9c0 4.5 5.5 9.5 5.5 9.5S16.5 13.5 16.5 9c0-3-2.5-5.5-5.5-5.5Z" />
      <circle cx="11" cy="9" r="2" />
    </svg>
  );
}
function IconCities() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18V10l5-5 5 5v8" />
      <path d="M14 18V8l4-3v13" />
      <path d="M3 18h16" />
      <path d="M8 14h2" />
    </svg>
  );
}
function IconTopProvince() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3L2.5 7.5v7L11 19l8.5-4.5v-7L11 3Z" />
      <path d="M11 3v16M2.5 7.5l8.5 4.5 8.5-4.5" />
    </svg>
  );
}
function IconTopCity() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5L11 5l7 6.5V19H4V11.5Z" />
      <path d="M9 19v-5h4v5" />
    </svg>
  );
}

export default async function AdminDashboardLocationPage({ searchParams }: AdminDashboardLocationPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const provinces = metrics.location.provinces;
  const cities = metrics.location.cities;
  const topProvinceRevenue = provinces[0];
  const topCityRevenue = cities[0];
  const periodLabel = DASHBOARD_PERIODS[period].label;

  const totalRevenue = provinces.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <DashboardSubpageShell
      sectionLabel="Ubicación"
      title="Ubicación"
      subtitle={`Rendimiento comercial por provincia y localidad. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Provincias con ventas"
          value={formatDashboardNumber(provinces.length)}
          description="Provincias con al menos una venta registrada."
          icon={<IconProvinces />}
          tone="accent"
        />
        <KpiCard
          title="Localidades con ventas"
          value={formatDashboardNumber(cities.length)}
          description="Localidades con ventas registradas."
          icon={<IconCities />}
          tone="success"
        />
        <KpiCard
          title="Provincia líder"
          value={topProvinceRevenue ? topProvinceRevenue.province : "—"}
          description={topProvinceRevenue ? formatDashboardPrice(topProvinceRevenue.revenue) : "Sin datos"}
          icon={<IconTopProvince />}
          tone="warning"
        />
        <KpiCard
          title="Localidad líder"
          value={topCityRevenue ? topCityRevenue.city : "—"}
          description={topCityRevenue ? `${topCityRevenue.province} · ${formatDashboardPrice(topCityRevenue.revenue)}` : "Sin datos"}
          icon={<IconTopCity />}
          tone="neutral"
        />
      </div>

      {provinces.length === 0 ? (
        <EmptyState
          title="Todavía no hay ventas con ubicación registrada en este período."
          description="Sin datos para este período."
        />
      ) : (
        <>
          {/* Main charts */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.52fr]">
            <ChartCard
              title="Top provincias"
              description={`Facturación y pedidos por provincia — ${periodLabel}.`}
            >
              <DashboardLocationChart data={provinces} />
            </ChartCard>

            <div className="flex flex-col gap-4">
              <RankingCard
                title="Distribución de ventas por provincia"
                description="Pedidos y facturación por provincia."
                items={provinces.map((item) => ({
                  id: item.province,
                  title: item.province,
                  subtitle: `${formatDashboardPrice(item.revenue)} facturados`,
                  value: item.orders,
                  secondaryValue: formatDashboardPrice(item.revenue),
                  tone: "accent" as const,
                }))}
                emptyState={<EmptyState title="Sin provincias para mostrar" description="Sin datos para este período." />}
              />
            </div>
          </div>

          {/* Province + city table */}
          <ChartCard
            title="Órdenes por provincia y localidad"
            description="Detalle de facturación y pedidos con desglose geográfico."
            className="min-w-0"
          >
            {cities.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-sm">
                    <thead className="border-b border-slate-100 text-left">
                      <tr>
                        {["Provincia", "Localidad", "Facturación", "Pedidos", "%"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cities.slice(0, 20).map((item) => {
                        const share = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                        return (
                          <tr key={`${item.province}-${item.city}`} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-3 text-[13px] text-slate-500">{item.province}</td>
                            <td className="px-4 py-3 text-[13px] font-medium text-slate-900">{item.city}</td>
                            <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(item.revenue)}</td>
                            <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(item.orders)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-[#c4b5a5]"
                                    style={{ width: `${Math.max(share, 0)}%` }}
                                  />
                                </div>
                                <span className="text-[12px] text-slate-500">{formatDashboardPercent(share)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="grid gap-3 md:hidden">
                  {cities.slice(0, 10).map((item) => (
                    <div key={`${item.province}-${item.city}`} className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900">{item.city}</p>
                          <p className="text-[11px] text-slate-400">{item.province}</p>
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold text-slate-900">{formatDashboardPrice(item.revenue)}</p>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">{formatDashboardNumber(item.orders)} pedidos</p>
                    </div>
                  ))}
                </div>

                {cities.length > 20 ? (
                  <p className="mt-3 text-[12px] text-slate-400">
                    Mostrando 20 de {formatDashboardNumber(cities.length)} localidades.
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="Todavía no hay ventas con ubicación registrada en este período."
                description="Sin datos para este período."
              />
            )}
          </ChartCard>
        </>
      )}
    </DashboardSubpageShell>
  );
}
