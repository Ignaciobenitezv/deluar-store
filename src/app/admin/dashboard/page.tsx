import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{
    period?: string;
    topProductsLimit?: string;
    topProductsPage?: string;
  }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)}%`;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");

  if (!domain) {
    return email;
  }

  return `${localPart.slice(0, Math.min(2, localPart.length))}***@${domain}`;
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Sparkline({
  values,
  tone = "neutral",
}: {
  values: number[];
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  const width = 180;
  const height = 44;
  const padding = 4;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const normalizedValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...normalizedValues, 1);
  const points = normalizedValues.map((value, index) => {
    const x =
      normalizedValues.length === 1
        ? width / 2
        : padding + (usableWidth * index) / (normalizedValues.length - 1);
    const y = padding + usableHeight - (value / maxValue) * usableHeight;
    return `${x},${y}`;
  });

  const toneClasses = {
    neutral: "stroke-foreground",
    success: "stroke-emerald-700",
    warning: "stroke-amber-700",
    accent: "stroke-[#6f4b3a]",
  } as const;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full" aria-hidden="true">
      <polyline
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={toneClasses[tone]}
        points={points.join(" ")}
        opacity="0.28"
      />
      <polyline
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={toneClasses[tone]}
        points={points.join(" ")}
      />
    </svg>
  );
}

function SectionCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "rounded-[1.6rem] border border-border/80 bg-surface shadow-[0_12px_30px_rgba(24,18,14,0.05)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
  sparkline,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  sparkline: number[];
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  return (
    <article className="rounded-[1.35rem] border border-border/80 bg-surface p-4 shadow-[0_10px_28px_rgba(24,18,14,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
          <p className="mt-3 text-[1.7rem] font-semibold tracking-[-0.03em] text-foreground">
            {value}
          </p>
          {helper ? <p className="mt-1.5 text-sm leading-6 text-muted">{helper}</p> : null}
        </div>
        <div className="w-28 shrink-0">
          <Sparkline values={sparkline} tone={tone} />
        </div>
      </div>
    </article>
  );
}

function MiniBar({
  value,
  max,
  tone = "neutral",
}: {
  value: number;
  max: number;
  tone?: "neutral" | "success" | "warning" | "accent" | "danger";
}) {
  const width = max > 0 ? `${Math.max(6, (value / max) * 100)}%` : "0%";
  const toneClasses = {
    neutral: "bg-foreground/80",
    success: "bg-emerald-700",
    warning: "bg-amber-700",
    accent: "bg-[#6f4b3a]",
    danger: "bg-rose-700",
  } as const;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted/80">
      <div className={classNames("h-full rounded-full transition-[width] duration-300", toneClasses[tone])} style={{ width }} />
    </div>
  );
}

function RankingList({
  items,
  emptyMessage,
}: {
  items: {
    id: string;
    title: string;
    subtitle?: string;
    value: number;
    secondary?: string;
    tone?: "neutral" | "success" | "warning" | "accent" | "danger";
  }[];
  emptyMessage: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              {item.subtitle ? <p className="mt-1 text-xs text-muted">{item.subtitle}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-foreground">{formatNumber(item.value)}</p>
              {item.secondary ? <p className="text-xs text-muted">{item.secondary}</p> : null}
            </div>
          </div>
          <div className="mt-3">
            <MiniBar value={item.value} max={maxValue} tone={item.tone ?? "neutral"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockedTile({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-3 inline-flex rounded-full border border-border/70 bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        Próxima etapa
      </div>
    </div>
  );
}

function Badge({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    neutral: "border-border/70 bg-background text-foreground",
    success: "border-emerald-700/20 bg-emerald-50 text-emerald-900",
    warning: "border-amber-700/20 bg-amber-50 text-amber-900",
    danger: "border-rose-700/20 bg-rose-50 text-rose-900",
    } as const;

  return (
    <div className={classNames("rounded-2xl border px-4 py-3", toneClasses[tone])}>
      <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  max,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max: number;
  helper?: string;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  const toneClasses = {
    neutral: "bg-foreground/80",
    success: "bg-emerald-700",
    warning: "bg-amber-700",
    accent: "bg-[#6f4b3a]",
    danger: "bg-rose-700",
  } as const;

  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
        </div>
        <p className="text-sm font-semibold text-foreground">{formatNumber(value)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/80">
        <div
          className={classNames("h-full rounded-full", toneClasses[tone])}
          style={{ width: `${max > 0 ? Math.max(6, (value / max) * 100) : 0}%` }}
        />
      </div>
    </div>
  );
}

function TrackingPlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-border/80 bg-background/70 p-5 shadow-[0_10px_24px_rgba(24,18,14,0.03)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{title}</p>
      <p className="mt-3 text-sm leading-6 text-foreground">{description}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">Sin datos todavía</p>
    </div>
  );
}

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

function lastSparkValues(values: number[]) {
  if (values.length === 0) {
    return [0];
  }

  return values.slice(-10);
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  await requireAdminSession();

  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const topProductsLimit = normalizeProductsLimit(resolvedSearchParams?.topProductsLimit);
  const topProductsPage = normalizePage(resolvedSearchParams?.topProductsPage);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDateTime(new Date());

  const dailyRevenue = metrics.sales.daily.map((item) => item.revenue);
  const dailyCreatedOrders = metrics.sales.daily.map((item) => item.createdOrders);
  const dailyUnits = metrics.sales.daily.map((item) => item.unitsSold);

  const provinces = metrics.location.provinces.map((item) => ({
    id: item.province,
    title: item.province,
    subtitle: `${formatNumber(item.orders)} pedidos`,
    value: item.revenue,
    secondary: formatNumber(item.orders),
    tone: "accent" as const,
  }));
  const cities = metrics.location.cities.map((item) => ({
    id: `${item.province}-${item.city}`,
    title: item.city,
    subtitle: item.province,
    value: item.revenue,
    secondary: `${formatNumber(item.orders)} pedidos`,
    tone: "neutral" as const,
  }));
  const paymentMethods = metrics.payments.methods.map((item) => ({
    id: item.method,
    title: item.label,
    subtitle: `${formatPrice(item.revenue)} facturados`,
    value: item.orders,
    secondary: formatNumber(item.orders),
    tone: "success" as const,
  }));
  const shippingMethods = metrics.shipping.methods.map((item) => ({
    id: item.method,
    title: item.label,
    subtitle: `${formatPrice(item.revenue)} facturados`,
    value: item.orders,
    secondary: `${formatPrice(item.shippingCostTotal)} en envíos`,
    tone: "accent" as const,
  }));
  const paymentStatuses = metrics.payments.statusBreakdown.map((item) => ({
    id: item.status,
    title: item.label,
    subtitle: item.status,
    value: item.orders,
    secondary: formatNumber(item.orders),
    tone: item.status === "APPROVED" ? ("success" as const) : item.status === "PENDING" ? ("warning" as const) : item.status === "REJECTED" || item.status === "CHARGED_BACK" ? ("danger" as const) : ("neutral" as const),
  }));
  const topCustomers = metrics.customers.topCustomers.map((customer) => ({
    id: customer.email,
    title: customer.displayName,
    subtitle: maskEmail(customer.email),
    value: customer.revenue,
    secondary: `${formatNumber(customer.orders)} pedidos`,
    tone: "accent" as const,
  }));

  const totalTopProducts = metrics.products.topSold.length;
  const totalTopProductPages = Math.max(1, Math.ceil(totalTopProducts / topProductsLimit));
  const currentTopProductPage = Math.min(topProductsPage, totalTopProductPages);
  const topProductsStart = (currentTopProductPage - 1) * topProductsLimit;
  const topProductsEnd = topProductsStart + topProductsLimit;
  const topProductsPageItems = metrics.products.topSold.slice(topProductsStart, topProductsEnd);
  const topProductsMaxUnits = Math.max(...topProductsPageItems.map((item) => item.unitsSold), 1);

  const productPageHref = (nextPage: number, nextLimit = topProductsLimit) =>
    `/admin/dashboard?period=${period}&topProductsLimit=${nextLimit}&topProductsPage=${nextPage}`;

  const buildLimitHref = (nextLimit: number) =>
    `/admin/dashboard?period=${period}&topProductsLimit=${nextLimit}&topProductsPage=1`;

  const maxCheckout = Math.max(
    metrics.conversion.checkoutOrders,
    metrics.conversion.paidOrders,
    metrics.conversion.pendingOrders,
    metrics.conversion.failedOrders,
    metrics.conversion.cancelledOrders,
    1,
  );
  const maxPayments = Math.max(...metrics.payments.statusBreakdown.map((item) => item.orders), 1);
  const maxShipping = Math.max(
    metrics.shipping.homeDeliveryOrders,
    metrics.shipping.cityBranchOrders,
    metrics.shipping.pickupOrders,
    1,
  );

  const periodButtons = Object.entries(DASHBOARD_PERIODS).map(([value, config]) => {
    const isActive = value === period;

    return (
      <Link
        key={value}
        href={`/admin/dashboard?period=${value}`}
        className={classNames(
          "rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
          isActive
            ? "border-foreground bg-foreground text-background"
            : "border-border/70 bg-background/70 text-foreground hover:bg-surface",
        )}
      >
        {config.label}
      </Link>
    );
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-[2rem] border border-border/80 bg-[linear-gradient(135deg,rgba(255,250,244,0.98),rgba(246,238,230,0.96))] p-6 shadow-[0_16px_40px_rgba(24,18,14,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              Visión general
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Dashboard comercial de Deluar Store
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              Mostrando datos según fecha de creación de la orden. Las métricas reales se
              calculan sobre órdenes pagadas o aprobadas. Período activo: {DASHBOARD_PERIODS[period].label}.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">{periodButtons}</div>
            <div className="text-right text-xs text-muted">
              <p>Última actualización</p>
              <p className="mt-1 font-medium text-foreground">{lastUpdated}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ventas"
          value={formatNumber(metrics.summary.unitsSold)}
          helper="Unidades vendidas en el período."
          sparkline={lastSparkValues(dailyUnits)}
          tone="accent"
        />
        <MetricCard
          label="Facturación"
          value={formatPrice(metrics.summary.billingTotal)}
          helper="Solo órdenes aprobadas o pagadas."
          sparkline={lastSparkValues(dailyRevenue)}
          tone="success"
        />
        <MetricCard
          label="Ticket promedio"
          value={formatPrice(metrics.summary.averageTicket)}
          helper="Promedio por orden pagada."
          sparkline={lastSparkValues(
            metrics.sales.daily.map((item) => (item.paidOrders > 0 ? item.revenue / item.paidOrders : 0)),
          )}
          tone="warning"
        />
        <MetricCard
          label="Pedidos creados"
          value={formatNumber(metrics.summary.createdOrders)}
          helper="Órdenes generadas en el período."
          sparkline={lastSparkValues(dailyCreatedOrders)}
          tone="neutral"
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Comportamiento de visitantes"
          description="Disponible al activar tracking avanzado."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <BlockedTile
              title="Total de visitas"
              description="Sin datos todavía. Se habilita con tracking avanzado."
            />
            <BlockedTile
              title="Vista de categoría"
              description="Sin datos todavía. Próxima etapa de analytics."
            />
            <BlockedTile
              title="Vista de producto"
              description="Sin datos todavía. Próxima etapa de analytics."
            />
            <BlockedTile
              title="Carritos creados"
              description="Sin carrito persistido todavía."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Conversión comercial"
          description="Lectura honesta del checkout y las órdenes reales."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Badge
              label="Checkout / pedidos creados"
              value={formatNumber(metrics.conversion.checkoutOrders)}
            />
            <Badge
              label="Pedidos pagados"
              value={formatNumber(metrics.conversion.paidOrders)}
              tone="success"
            />
            <Badge
              label="Tasa de aprobación"
              value={formatPercent(metrics.conversion.approvalRate)}
              tone="success"
            />
            <Badge
              label="Pedidos pendientes"
              value={formatNumber(metrics.conversion.pendingOrders)}
              tone="warning"
            />
            <Badge
              label="Pedidos fallidos"
              value={formatNumber(metrics.conversion.failedOrders)}
              tone="danger"
            />
            <Badge
              label="Pedidos cancelados"
              value={formatNumber(metrics.conversion.cancelledOrders)}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Pedidos pagados pendientes de preparación</p>
                <p className="mt-1 text-xs text-muted">Incluye órdenes pagadas sin estado finalizado.</p>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatNumber(metrics.conversion.paidPendingPreparationOrders)}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Checkout"
          description="Embudo parcial basado en órdenes reales. Tracking avanzado pendiente."
        >
          <div className="grid gap-3">
            <FunnelRow
              label="Checkout iniciado"
              value={metrics.conversion.checkoutOrders}
              max={maxCheckout}
              helper="Aproximado con pedidos creados."
              tone="accent"
            />
            <FunnelRow
              label="Pedidos creados"
              value={metrics.conversion.checkoutOrders}
              max={maxCheckout}
              helper="Coincide con el checkout real actual."
              tone="neutral"
            />
            <FunnelRow
              label="Pedidos pagos"
              value={metrics.conversion.paidOrders}
              max={maxCheckout}
              helper="Órdenes aprobadas o pagadas."
              tone="success"
            />
            <BlockedTile
              title="Etapa de entrega"
              description="No disponible todavía. Próxima etapa."
            />
            <BlockedTile
              title="Etapa de pago"
              description="No disponible todavía. Próxima etapa."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Ventas por día"
          description="Comparación compacta por día sin ocupar demasiado alto."
        >
          <div className="space-y-3">
            {metrics.sales.daily.map((item) => (
              <div key={item.date} className="rounded-2xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatShortDate(item.date)}</p>
                    <p className="text-xs text-muted">
                      {formatNumber(item.createdOrders)} creados · {formatNumber(item.paidOrders)} pagos · {formatNumber(item.unitsSold)} uds.
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatPrice(item.revenue)}</p>
                </div>
                <div className="mt-3 grid gap-2">
                  <MiniBar value={item.createdOrders} max={Math.max(...metrics.sales.daily.map((day) => day.createdOrders), 1)} tone="neutral" />
                  <MiniBar value={item.paidOrders} max={Math.max(...metrics.sales.daily.map((day) => day.paidOrders), 1)} tone="success" />
                  <MiniBar value={item.revenue} max={Math.max(...metrics.sales.daily.map((day) => day.revenue), 1)} tone="accent" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Productos"
          description="Módulo compacto como panel ecommerce, con ranking y detalle pendiente de variantes."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
            <div className="rounded-[1.35rem] border border-border/70 bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Top productos más vendidos</p>
                  <p className="mt-1 text-xs text-muted">
                    Ranking compacto con barras proporcionales.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Mostrar</span>
                  {[5, 10, 25, 50].map((limit) => (
                    <Link
                      key={limit}
                      href={buildLimitHref(limit)}
                      className={classNames(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition",
                        topProductsLimit === limit
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/70 bg-surface text-foreground hover:bg-background",
                      )}
                    >
                      {limit}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Unidades vendidas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsPageItems.length > 0 ? (
                      topProductsPageItems.map((product) => (
                        <tr key={product.productId} className="border-t border-border/70">
                          <td className="relative px-4 py-3">
                            <div
                              className="absolute inset-y-2 left-2 rounded-2xl bg-[#ead6bf]/65"
                              style={{
                                width: `${Math.max(8, (product.unitsSold / topProductsMaxUnits) * 100)}%`,
                              }}
                            />
                            <div className="relative z-10">
                              <p className="text-sm font-medium text-foreground">{product.productName}</p>
                              <p className="mt-1 text-xs text-muted">{product.productSlug}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <MiniBar value={product.unitsSold} max={topProductsMaxUnits} tone="accent" />
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-foreground">
                                {formatNumber(product.unitsSold)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-border/70">
                        <td className="px-4 py-6 text-sm text-muted" colSpan={2}>
                          No hay ventas para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Mostrando {topProductsStart + 1}-{Math.min(topProductsEnd, totalTopProducts)} de {totalTopProducts}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={productPageHref(Math.max(1, currentTopProductPage - 1))}
                    className={classNames(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold",
                      currentTopProductPage > 1
                        ? "border-border/70 bg-surface text-foreground hover:bg-background"
                        : "pointer-events-none border-border/40 bg-background/40 text-muted",
                    )}
                  >
                    Anterior
                  </Link>
                  {Array.from({ length: Math.min(totalTopProductPages, 4) }, (_, index) => {
                    const page = index + 1;

                    return (
                      <Link
                        key={page}
                        href={productPageHref(page)}
                        className={classNames(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold",
                          currentTopProductPage === page
                            ? "border-foreground bg-foreground text-background"
                            : "border-border/70 bg-surface text-foreground hover:bg-background",
                        )}
                      >
                        {page}
                      </Link>
                    );
                  })}
                  <Link
                    href={productPageHref(Math.min(totalTopProductPages, currentTopProductPage + 1))}
                    className={classNames(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold",
                      currentTopProductPage < totalTopProductPages
                        ? "border-border/70 bg-surface text-foreground hover:bg-background"
                        : "pointer-events-none border-border/40 bg-background/40 text-muted",
                    )}
                  >
                    Siguiente
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-border/70 bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Detalle por variante de producto</p>
                  <p className="mt-1 text-xs text-muted">
                    Disponible al guardar variante/SKU en las órdenes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Mostrar</span>
                  <span className="rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    5
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <input
                  disabled
                  placeholder="Buscar producto o variante"
                  className="h-10 flex-1 rounded-full border border-border/70 bg-surface px-4 text-sm text-muted placeholder:text-muted/70"
                />
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-border/70 bg-background px-4 py-2 text-xs font-semibold text-muted"
                >
                  Buscar
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Variante
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Unidades vendidas
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Stock actual
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Días restantes de stock
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Facturación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border/70">
                      <td className="px-4 py-6 text-sm text-muted" colSpan={6}>
                        No hay datos de variantes todavía. Disponible al guardar variante/SKU en las órdenes.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-3">
                <p className="text-sm text-muted">Disponible al guardar variante/SKU en las órdenes.</p>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Pendiente</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Clientes"
          description="Clientes únicos, recurrentes y ranking por facturación."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Badge label="Clientes únicos" value={formatNumber(metrics.customers.uniqueCustomers)} />
            <Badge label="Clientes recurrentes" value={formatNumber(metrics.customers.recurrentCustomers)} tone="success" />
            <Badge label="Nuevos clientes" value={formatNumber(metrics.customers.newCustomers)} tone="warning" />
            <Badge label="Ranking disponible" value={formatNumber(metrics.customers.topCustomers.length)} />
          </div>
          <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-foreground">Ranking por facturación</p>
            <RankingList items={topCustomers} emptyMessage="No hay clientes con compras en el período." />
          </div>
        </SectionCard>

        <SectionCard
          title="Ubicación"
          description="Ventas reales agrupadas por provincia y localidad."
        >
          <div className="grid gap-4">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Top provincias con mayor facturación</p>
              <RankingList items={provinces} emptyMessage="No hay ventas por provincia." />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Top provincias en ventas</p>
              <RankingList
                items={metrics.location.provinces.map((item) => ({
                  id: `${item.province}-orders`,
                  title: item.province,
                  subtitle: `${formatPrice(item.revenue)} facturados`,
                  value: item.orders,
                  secondary: formatPrice(item.revenue),
                  tone: "accent" as const,
                }))}
                emptyMessage="No hay ventas por provincia."
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Top localidades</p>
              <RankingList items={cities} emptyMessage="No hay ventas por localidad." />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pagos"
          description="Métodos y estados de pago sobre órdenes reales."
        >
          <div className="grid gap-4">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Métodos de pago más usados</p>
              <RankingList items={paymentMethods} emptyMessage="No hay métodos de pago." />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Estado de pagos</p>
              <div className="space-y-3">
                {paymentStatuses.length > 0 ? (
                  paymentStatuses.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs text-muted">{item.subtitle}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{formatNumber(item.value)}</p>
                      </div>
                      <div className="mt-3">
                        <MiniBar value={item.value} max={maxPayments} tone={item.tone} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No hay estados de pago para mostrar.</p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Envíos"
          description="Métodos de envío y resumen operativo."
        >
          <div className="grid gap-4">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Métodos de envío más usados</p>
              <RankingList items={shippingMethods} emptyMessage="No hay métodos de envío." />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Badge
                label="Costo total cobrado"
                value={formatPrice(metrics.shipping.totalShippingCost)}
                tone="warning"
              />
              <Badge
                label="Retiros en Resistencia"
                value={formatNumber(metrics.shipping.pickupOrders)}
              />
              <Badge
                label="Envíos a domicilio"
                value={formatNumber(metrics.shipping.homeDeliveryOrders)}
                tone="success"
              />
              <Badge
                label="Envíos a sucursal"
                value={formatNumber(metrics.shipping.cityBranchOrders)}
              />
            </div>
            <div className="space-y-3">
              <FunnelRow
                label="Envío a domicilio"
                value={metrics.shipping.homeDeliveryOrders}
                max={maxShipping}
                helper="Método de mayor costo fijo."
                tone="accent"
              />
              <FunnelRow
                label="Envío a sucursal"
                value={metrics.shipping.cityBranchOrders}
                max={maxShipping}
                helper="Gratis desde el umbral de compra."
                tone="success"
              />
              <FunnelRow
                label="Retiro en Resistencia"
                value={metrics.shipping.pickupOrders}
                max={maxShipping}
                helper="Sin costo de envío."
                tone="neutral"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Marketing / tracking"
        description="Próxima etapa: tracking avanzado. Hoy no hay datos persistidos."
        className="mt-6"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <TrackingPlaceholderCard
            title="UTM origen"
            description="Sin datos todavía. Disponible al activar tracking avanzado."
          />
          <TrackingPlaceholderCard
            title="UTM medio"
            description="Sin datos todavía. Disponible al activar tracking avanzado."
          />
          <TrackingPlaceholderCard
            title="UTM campaña"
            description="Sin datos todavía. Disponible al activar tracking avanzado."
          />
          <TrackingPlaceholderCard
            title="Dispositivo"
            description="Sin datos todavía. Requiere evento de sesión."
          />
          <TrackingPlaceholderCard
            title="Recurrencia"
            description="Sin datos todavía. Se habilita con tracking de visitantes."
          />
        </div>
      </SectionCard>
    </main>
  );
}
