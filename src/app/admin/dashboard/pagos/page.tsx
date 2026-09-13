import type { Metadata } from "next";
import Link from "next/link";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  IconApproved,
  IconCollected,
  IconFailed,
  IconPayments,
  PaymentKpi,
  PaymentModule,
} from "@/features/admin/dashboard/components/payments/payment-modules";
import {
  PaymentEvolution,
  PaymentEvolutionLegend,
  PaymentWeekdayChart,
} from "@/features/admin/dashboard/components/payments/payment-charts";
import {
  PaymentMethodDonut,
  PaymentStatusDonut,
} from "@/features/admin/dashboard/components/payments/payment-donuts";
import {
  PaymentMethodTable,
  RecentPaymentsTable,
} from "@/features/admin/dashboard/components/payments/payment-tables";
import { PaymentMethodSelect } from "@/features/admin/dashboard/components/payments/payment-method-select";
import { bucketSeries } from "@/features/admin/dashboard/components/overview/overview-ui";
import {
  getPaymentsPageData,
  normalizePaymentsQuery,
} from "@/features/admin/analytics/server/payments-analytics-service";
import {
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagos | DELUAR",
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardPaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AdminDashboardPaymentsPage({
  searchParams,
}: AdminDashboardPaymentsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = normalizePaymentsQuery(resolvedSearchParams);
  const data = await getPaymentsPageData(query);

  const { summary, deltas, kpiSeries, daily, statusBreakdown, methods, weekdays, recent } = data;

  return (
    <main className="flex min-h-screen flex-col bg-[#f1f5f9]">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-5 border-b border-slate-200/70 bg-white px-6 lg:px-8">
        <nav aria-label="Ubicación" className="min-w-0 flex-1">
          <ol className="flex items-center gap-2 text-[13px]">
            <li className="font-medium text-slate-400">Estadísticas</li>
            <li aria-hidden className="text-slate-300">
              /
            </li>
            <li className="font-semibold text-slate-900" aria-current="page">
              Pagos
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] tabular-nums text-slate-400 lg:block">
            {formatGeneratedAt(data.generatedAt)}
          </span>
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 pb-12 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
            Pagos
          </h1>
          <p className="mt-3 text-[13.5px] text-slate-500">
            Transacciones, métodos de pago y su rendimiento · {data.periodLabel}
          </p>

          {/* ── Row 1 · four KPIs ───────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PaymentKpi
              icon={<IconCollected />}
              tone="primary"
              label="Monto cobrado"
              value={formatDashboardPrice(summary.collected)}
              series={bucketSeries(kpiSeries.collected)}
              delta={deltas.collected}
            />
            <PaymentKpi
              icon={<IconPayments />}
              tone="primary"
              label="Pagos realizados"
              value={formatDashboardNumber(summary.payments)}
              series={bucketSeries(kpiSeries.payments)}
              delta={deltas.payments}
            />
            <PaymentKpi
              icon={<IconApproved />}
              tone="positive"
              label="Pagos aprobados"
              value={formatDashboardNumber(summary.approved)}
              series={bucketSeries(kpiSeries.approved)}
              delta={deltas.approved}
            />
            <PaymentKpi
              icon={<IconFailed />}
              tone="negative"
              label="Pagos fallidos"
              value={formatDashboardNumber(summary.failed)}
              series={bucketSeries(kpiSeries.failed)}
              delta={deltas.failed}
              invertDelta
            />
          </div>

          {/* ── Row 2 · evolution 62% / status 38% ──────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.62fr_1fr]">
            <PaymentModule
              title="Evolución de pagos"
              note="Monto y cantidad de pagos por día."
              control={
                <div className="flex flex-wrap items-center gap-3">
                  <PaymentEvolutionLegend />
                  <PaymentMethodSelect options={data.methodOptions} value={query.method} />
                </div>
              }
            >
              <PaymentEvolution data={daily} height={250} />
            </PaymentModule>

            <PaymentModule title="Estado de los pagos" note="Distribución por estado.">
              <PaymentStatusDonut
                rows={statusBreakdown}
                total={data.totalPayments}
                emptyMessage="No se registraron pagos en el período seleccionado."
              />
            </PaymentModule>
          </div>

          {/* ── Row 3 · methods donut 1fr / performance table 1.4fr ─────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_1.4fr]">
            <PaymentModule title="Métodos de pago" note="Participación del monto cobrado.">
              <PaymentMethodDonut
                rows={methods}
                centerValue={formatDashboardPrice(summary.collected)}
                emptyMessage="Ningún método registró cobros en el período."
              />
            </PaymentModule>

            <PaymentModule
              title="Rendimiento por método de pago"
              note="Tasa de aprobación y volumen por método."
            >
              <PaymentMethodTable rows={methods} />
            </PaymentModule>
          </div>

          {/* ── Row 4 · weekday distribution, full width ────────────────────── */}
          <PaymentModule
            title="Pagos por día de la semana"
            note="Cantidad de pagos realizados."
            className="mt-3"
          >
            <PaymentWeekdayChart data={weekdays} height={220} />
          </PaymentModule>

          {/* ── Row 5 · the evidence table ──────────────────────────────────── */}
          <PaymentModule
            title="Últimos pagos del período"
            note="Detalle de las transacciones más recientes."
            className="mt-3"
            control={
              <Link
                href="/admin/orders"
                className="shrink-0 text-[12px] font-medium text-[#3b7ff5] underline-offset-[3px] hover:underline"
              >
                Ver todos →
              </Link>
            }
          >
            <RecentPaymentsTable rows={recent} />
          </PaymentModule>
        </div>
      </div>
    </main>
  );
}
