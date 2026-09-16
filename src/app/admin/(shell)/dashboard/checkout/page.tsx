import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  CheckoutKpi,
  CheckoutModule,
  CheckoutNote,
  DeltaChip,
  IconCart,
  IconCheckout,
  IconPayment,
  IconPurchase,
} from "@/features/admin/dashboard/components/checkout/checkout-modules";
import {
  CheckoutFunnel,
  ConversionRing,
} from "@/features/admin/dashboard/components/checkout/checkout-funnel";
import {
  CheckoutEvolution,
  CheckoutEvolutionLegend,
} from "@/features/admin/dashboard/components/checkout/checkout-charts";
import {
  DropOffBars,
  MethodDonut,
  ShareBars,
} from "@/features/admin/dashboard/components/checkout/checkout-tables";
import { CheckoutChannelSelect } from "@/features/admin/dashboard/components/checkout/checkout-channel-select";
import { bucketSeries } from "@/features/admin/dashboard/components/overview/overview-ui";
import {
  getCheckoutFunnelPageData,
  normalizeCheckoutFunnelQuery,
} from "@/features/admin/analytics/server/checkout-funnel-service";
import {
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finalización de compra | DELUAR",
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardCheckoutPageProps = {
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

const FIELD =
  "w-full rounded-[6px] border border-[#e2e8f0] bg-surface px-3 py-[8px] text-[13px] text-text-primary outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#3b7ff5] focus:ring-2 focus:ring-[#3b7ff5]/15";
const FIELD_LABEL =
  "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-secondary";

export default async function AdminDashboardCheckoutPage({
  searchParams,
}: AdminDashboardCheckoutPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = normalizeCheckoutFunnelQuery(resolvedSearchParams);
  const data = await getCheckoutFunnelPageData(query);

  const { summary, deltas, kpiSeries, funnel, daily, dropOffs, paidOrders, periodLabel } = data;
  const lastUpdated = formatGeneratedAt(data.generatedAt);

  /**
   * The biggest single loss in the funnel, named from the funnel itself. With
   * no cohort there is nothing to name, and the note says that instead.
   */
  const worstDrop = [...dropOffs].sort((a, b) => b.value - a.value)[0];

  /**
   * The honest headline of this period: paid orders that no tracked cart
   * converted into. They are real revenue the funnel cannot see, and saying so
   * is more useful than quietly reconciling the two numbers.
   */
  const hasCohort = summary.carts > 0;
  const untracked = data.untrackedPaidOrders;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b border-border bg-background px-6 lg:px-8">
        <nav aria-label="Ubicación" className="min-w-0 flex-1">
          <ol className="flex items-center gap-2 text-[13px]">
            <li className="font-medium text-text-secondary">Estadísticas</li>
            <li aria-hidden className="text-text-secondary">
              /
            </li>
            <li className="font-semibold text-text-primary" aria-current="page">
              Finalización de compra
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] tabular-nums text-text-secondary lg:block">
            {lastUpdated}
          </span>
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 pb-12 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-text-primary">
            Finalización de compra
          </h1>
          <p className="mt-3 text-[13.5px] text-text-secondary">
            Del carrito al pago aprobado: dónde avanzan y dónde se pierden las compras ·{" "}
            {periodLabel}
          </p>

          {/* ── Row 1 · four KPIs ───────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CheckoutKpi
              icon={<IconCart />}
              tone="primary"
              label="Carritos creados"
              value={formatDashboardNumber(summary.carts)}
              series={bucketSeries(kpiSeries.carts)}
              delta={deltas.carts}
            />
            <CheckoutKpi
              icon={<IconCheckout />}
              tone="primary"
              label="Checkouts iniciados"
              value={formatDashboardNumber(summary.checkouts)}
              series={bucketSeries(kpiSeries.checkouts)}
              delta={deltas.checkouts}
            />
            <CheckoutKpi
              icon={<IconPayment />}
              tone="secondary"
              label="Órdenes creadas"
              value={formatDashboardNumber(summary.orders)}
              series={bucketSeries(kpiSeries.orders)}
              delta={deltas.orders}
            />
            <CheckoutKpi
              icon={<IconPurchase />}
              tone="secondary"
              label="Compras completadas"
              value={formatDashboardNumber(summary.purchases)}
              series={bucketSeries(kpiSeries.purchases)}
              delta={deltas.purchases}
            />
          </div>

          {/* ── Row 2 · funnel 62% / conversion 38% ─────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.62fr_1fr]">
            <CheckoutModule
              title="Funnel de finalización de compra"
              note="Recorrido de los carritos creados en el período."
              control={
                <CheckoutChannelSelect options={data.filters.channels} value={query.channel} />
              }
            >
              <CheckoutFunnel stages={funnel} />
            </CheckoutModule>

            <CheckoutModule
              title="Tasa de finalización"
              note="Carritos del período que terminaron en una compra pagada."
            >
              <ConversionRing
                completed={summary.purchases}
                notCompleted={summary.notCompleted}
                rate={summary.completionRate}
              />
              {hasCohort ? (
                <CheckoutNote
                  tone={summary.completionRate >= 50 ? "neutral" : "warning"}
                  title={`${formatDashboardPercent(summary.completionRate)} de los carritos termina en compra.`}
                  body={
                    worstDrop && worstDrop.value > 0
                      ? `La mayor caída está en ${worstDrop.label.toLowerCase()}: ${formatDashboardNumber(worstDrop.value)} carritos (${worstDrop.share.toFixed(0)}%).`
                      : "Ningún carrito del período avanzó más allá de la primera etapa."
                  }
                />
              ) : (
                <CheckoutNote
                  tone="neutral"
                  title="Sin carritos registrados en el período."
                  body="El funnel se construye sobre carritos con productos. Cuando entre el primero, todas las etapas se pueblan solas."
                />
              )}
            </CheckoutModule>
          </div>

          {/* ── Row 3 · evolution 62% / drop-offs 38% ───────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.62fr_1fr]">
            <CheckoutModule
              title="Evolución del proceso de checkout"
              note="Cantidad de carritos por etapa, por día."
              control={<CheckoutEvolutionLegend />}
            >
              <CheckoutEvolution data={daily} height={250} />
            </CheckoutModule>

            <CheckoutModule
              title="Abandono por etapa"
              note="Dónde se pierden los carritos dentro del proceso."
            >
              <DropOffBars
                rows={dropOffs}
                emptyMessage="Todavía no hay carritos que hayan avanzado entre etapas en el período."
              />
            </CheckoutModule>
          </div>

          {/* ── Row 4 · three equal columns ─────────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <CheckoutModule
              title="Métodos de pago"
              note={`Sobre las ${formatDashboardNumber(paidOrders.count)} órdenes pagadas del período.`}
            >
              <MethodDonut
                rows={paidOrders.paymentMethods}
                centerValue={formatDashboardNumber(paidOrders.count)}
                centerLabel="compras"
                emptyMessage="Ninguna orden del período llegó a pagarse."
              />
            </CheckoutModule>

            <CheckoutModule
              title="Métodos de envío"
              note={`Sobre las ${formatDashboardNumber(paidOrders.count)} órdenes pagadas del período.`}
            >
              <MethodDonut
                rows={paidOrders.shippingMethods}
                centerValue={formatDashboardNumber(paidOrders.count)}
                centerLabel="compras"
                emptyMessage="Ninguna orden del período llegó a pagarse."
              />
            </CheckoutModule>

            <CheckoutModule
              title="Ticket de la compra completada"
              note="Valor de las órdenes que terminaron pagas."
            >
              <div className="flex flex-col gap-5 px-5 pb-5 sm:flex-row sm:items-start sm:gap-6">
                <div className="shrink-0 sm:w-[132px]">
                  <p className="text-[1.55rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary">
                    {paidOrders.count > 0 ? formatDashboardPrice(paidOrders.averageTicket) : "—"}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-text-secondary">ticket promedio</p>
                  <p className="mt-3">
                    <DeltaChip delta={paidOrders.averageTicketDelta} />
                  </p>
                  {paidOrders.averageTicketDelta.direction !== "unmeasurable" ? (
                    <p className="mt-1 text-[11.5px] text-text-secondary">vs. período anterior</p>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <ShareBars
                    rows={paidOrders.ticketBuckets}
                    emptyMessage="Ninguna orden del período llegó a pagarse."
                    labelWidth={134}
                  />
                </div>
              </div>
            </CheckoutModule>
          </div>

          {/* ── Row 5 · filters, compact and secondary ──────────────────────── */}
          <CheckoutModule
            title="Filtros"
            note="Filtrá por canal, método de pago, método de envío o estado del pago."
            className="mt-3"
          >
            <form method="get" className="px-5 pb-5">
              <input type="hidden" name="period" value={query.period} />

              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 basis-[170px]">
                  <span className={FIELD_LABEL}>Canal</span>
                  <select name="channel" defaultValue={query.channel} className={FIELD}>
                    {data.filters.channels.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-1 basis-[170px]">
                  <span className={FIELD_LABEL}>Método de pago</span>
                  <select name="paymentMethod" defaultValue={query.paymentMethod} className={FIELD}>
                    {data.filters.paymentMethods.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-1 basis-[170px]">
                  <span className={FIELD_LABEL}>Método de envío</span>
                  <select
                    name="shippingMethod"
                    defaultValue={query.shippingMethod}
                    className={FIELD}
                  >
                    {data.filters.shippingMethods.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-1 basis-[170px]">
                  <span className={FIELD_LABEL}>Estado de pago</span>
                  <select name="paymentStatus" defaultValue={query.paymentStatus} className={FIELD}>
                    {data.filters.paymentStatuses.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/admin/dashboard/checkout?period=${query.period}`}
                    className="rounded-[6px] border border-[#e2e8f0] bg-surface px-4 py-[8px] text-[13px] font-medium text-text-primary transition-colors hover:border-[#cbd5e1] hover:text-text-primary"
                  >
                    Limpiar
                  </a>
                  <button
                    type="submit"
                    className="rounded-[6px] bg-[#3b7ff5] px-5 py-[8px] text-[13px] font-medium text-white transition-colors hover:bg-[#2f6de0]"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </form>
          </CheckoutModule>

          {/* The reconciliation the two populations demand, stated once. */}
          {untracked > 0 ? (
            <p
              className={cn(
                "mt-3 rounded-[8px] border border-[#e2e8f0] bg-surface px-5 py-3.5 text-[12.5px] leading-[1.5] text-text-secondary",
              )}
            >
              <span className="font-medium text-slate-800">
                {formatDashboardNumber(untracked)}{" "}
                {untracked === 1 ? "orden pagada" : "órdenes pagadas"} del período sin carrito
                asociado.
              </span>{" "}
              El funnel sólo puede seguir compras que empezaron en un carrito trackeado, así que
              estas órdenes cuentan en los módulos de pago, envío y ticket, pero no en las etapas de
              arriba.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
