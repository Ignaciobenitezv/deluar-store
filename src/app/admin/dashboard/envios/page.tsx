import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShippingChart } from "@/features/admin/dashboard/components/charts/dashboard-shipping-chart";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { AndreaniExportPanel } from "@/features/shipments/components/andreani-export-panel";
import { getAndreaniExportCandidates } from "@/features/shipments/andreani-export/service";
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
  title: "Envíos | DELUAR",
};

type AdminDashboardShippingPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function IconShipments() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h13M3 8v9h13V8M3 8l2-4h9l2 4" />
      <path d="M16 8l2 1v8l-2 1" />
      <path d="M7 17v2M12 17v2" />
    </svg>
  );
}
function IconCost() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6v10M8.5 8.5c0-1.1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.7-5 2.2-5 5.2 0 1.5 1.5 2 3 2s2.5-.7 2.5-2" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L11 4l8 6.5V19H3V10.5Z" />
      <path d="M8.5 19v-6h5v6" />
    </svg>
  );
}
function IconPickup() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h14v4H4V4Z" />
      <path d="M4 8h14v10H4V8Z" />
      <path d="M9 14h4" />
    </svg>
  );
}

function OperationRow({
  label,
  sublabel,
  value,
  dotColor,
}: {
  label: string;
  sublabel: string;
  value: string;
  dotColor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#e8e5e1] bg-white px-3.5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-900">{label}</p>
          <p className="text-[11px] text-slate-400">{sublabel}</p>
        </div>
      </div>
      <p className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminDashboardShippingPage({
  searchParams,
}: AdminDashboardShippingPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const andreaniExportData = await getAndreaniExportCandidates();
  const lastUpdated = formatDashboardDateTime(new Date());

  const shippingMethods = metrics.shipping.methods;
  const totalShippingOrders = metrics.shipping.shippingOrders;
  const totalShippingCost = metrics.shipping.totalShippingCost;
  const averageShippingCost = metrics.shipping.averageShippingCost;
  const freeShippingOrders = metrics.shipping.freeShippingOrders;
  const paidShippingOrders = metrics.shipping.paidShippingOrders;

  const periodLabel = DASHBOARD_PERIODS[period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Envíos"
      title="Envíos"
      subtitle={`Operación de envíos basada en pedidos reales. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Envíos creados"
          value={formatDashboardNumber(totalShippingOrders)}
          description="Pedidos con método de envío registrado."
          icon={<IconShipments />}
          tone="accent"
        />
        <KpiCard
          title="Costo total cobrado"
          value={formatDashboardPrice(totalShippingCost)}
          description="Costo de envío cobrado en el período."
          icon={<IconCost />}
          tone="success"
        />
        <KpiCard
          title="Envío a domicilio"
          value={formatDashboardNumber(metrics.shipping.homeDeliveryOrders)}
          description="Entregas directas al cliente."
          icon={<IconHome />}
          tone="warning"
        />
        <KpiCard
          title="Métrico costo"
          value={formatDashboardPrice(averageShippingCost)}
          description="Costo promedio por pedido con envío."
          icon={<IconPickup />}
          tone="neutral"
        />
      </div>

      {/* Main grid: chart + operative */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.52fr]">
        <ChartCard
          title="Distribución de envíos"
          description={`Distribución de pedidos y costo por método de envío — ${periodLabel}.`}
        >
          <DashboardShippingChart data={shippingMethods} />
        </ChartCard>

        <ChartCard title="Distribución operativa" description="Desglose por tipo de operación registrada en las órdenes.">
          {totalShippingOrders > 0 ? (
            <div className="space-y-3">
              {/* Cost summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-slate-400">Costo total</p>
                  <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-slate-900">
                    {formatDashboardPrice(totalShippingCost)}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-slate-400">Costo promedio</p>
                  <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-slate-900">
                    {formatDashboardPrice(averageShippingCost)}
                  </p>
                </div>
                <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-emerald-600">Envíos gratis</p>
                  <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-emerald-900">
                    {formatDashboardNumber(freeShippingOrders)}
                  </p>
                </div>
                <div className="rounded-[8px] border border-sky-200 bg-sky-50 px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-sky-600">Envíos pagos</p>
                  <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-sky-900">
                    {formatDashboardNumber(paidShippingOrders)}
                  </p>
                </div>
              </div>

              {/* Operation rows */}
              <div className="space-y-2">
                <OperationRow
                  label="Retiros en Resistencia"
                  sublabel="Pedidos retirados en punto local."
                  value={formatDashboardNumber(metrics.shipping.pickupOrders)}
                  dotColor="bg-[#c4b5a5]"
                />
                <OperationRow
                  label="Envíos a domicilio"
                  sublabel="Entrega directa al cliente."
                  value={formatDashboardNumber(metrics.shipping.homeDeliveryOrders)}
                  dotColor="bg-emerald-400"
                />
                <OperationRow
                  label="Envíos a sucursal"
                  sublabel="Entrega en punto de retiro."
                  value={formatDashboardNumber(metrics.shipping.cityBranchOrders)}
                  dotColor="bg-sky-400"
                />
              </div>
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay pedidos con método de envío en este período."
              description="La operativa de envíos aparecerá cuando haya pedidos registrados."
            />
          )}
        </ChartCard>
      </div>

      {/* Andreani export */}
      <AndreaniExportPanel
        shipments={andreaniExportData.shipments}
        summary={andreaniExportData.summary}
      />
    </DashboardSubpageShell>
  );
}
