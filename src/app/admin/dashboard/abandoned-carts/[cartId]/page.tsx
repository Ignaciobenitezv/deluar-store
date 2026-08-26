import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { formatDashboardDateTime, formatDashboardNumber, formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { getAbandonedCartDetail, formatAbandonedCartDateTime } from "@/features/admin/analytics/server/abandoned-carts-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detalle de carrito abandonado | Panel de comercio de DOTCOM",
};

type AbandonedCartDetailPageProps = {
  params?: Promise<{
    cartId: string;
  }>;
};

export default async function AbandonedCartDetailPage({ params }: AbandonedCartDetailPageProps) {
  const resolvedParams = await params;
  const cart = resolvedParams ? await getAbandonedCartDetail(resolvedParams.cartId) : null;
  const lastUpdated = formatDashboardDateTime(new Date());

  if (!cart) {
    return (
      <DashboardShell title="Detalle de carrito" subtitle="No se encontró el carrito solicitado." lastUpdated={lastUpdated}>
        <EmptyState
          title="Carrito no encontrado"
          description="El carrito puede haber sido eliminado o el identificador no existe."
          action={
            <Link
              href="/admin/dashboard/abandoned-carts"
              className="inline-flex rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver al listado
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Detalle de carrito abandonado"
      subtitle={`Carrito ${cart.cartId}. Estado posterior: ${cart.statusAfterLabel}.`}
      lastUpdated={lastUpdated}
    >
      <div className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard title="Subtotal" value={formatDashboardPrice(cart.subtotal)} description="Snapshot histórico del carrito." tone="success" />
        <KpiCard title="Unidades" value={formatDashboardNumber(cart.itemCount)} description="Cantidad total de ítems." tone="neutral" />
        <KpiCard title="Tiempo hasta abandono" value={cart.timeToAbandonLabel} description="Delta entre actividad y abandono." tone="warning" />
        <KpiCard title="Estado posterior" value={cart.statusAfterLabel} description="Lectura histórica posterior." tone="accent" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <ChartCard title="Snapshot completo" description="Productos persistidos en itemsSnapshot." className="min-w-0">
          {cart.items.length > 0 ? (
            <div className="grid gap-3">
              {cart.items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? "default"}`} className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{item.titleLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantityLabel}
                        {item.detailLabel ? ` · ${item.detailLabel}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-950">{formatDashboardPrice(item.lineTotal)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDashboardPrice(item.unitPrice)} c/u</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Producto</p>
                      <p className="mt-1 text-sm text-slate-700">{item.productId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">SKU</p>
                      <p className="mt-1 text-sm text-slate-700">{item.sku ?? ""}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin snapshot de productos" description="Este carrito no tiene ítems válidos en el snapshot." />
          )}
        </ChartCard>

        <ChartCard title="Metadatos" description="Contexto de sesión, atribución y orden relacionada." className="min-w-0">
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cart</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{cart.cartId}</p>
              <p className="mt-1 text-xs text-slate-500">visitor {cart.visitorId}</p>
              <p className="mt-1 text-xs text-slate-500">session {cart.sessionId ?? ""}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Abandonado</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{formatAbandonedCartDateTime(cart.abandonedAt)}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Última actividad</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{formatAbandonedCartDateTime(cart.lastActivityAt)}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Checkout iniciado</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {cart.checkoutStartedAt ? formatAbandonedCartDateTime(cart.checkoutStartedAt) : ""}
                </p>
              </div>
              <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Compra posterior</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {cart.purchaseCompletedAt ? formatAbandonedCartDateTime(cart.purchaseCompletedAt) : ""}
                </p>
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Atribución</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Fuente:</span> {cart.sourceLabel}</p>
                <p><span className="font-medium text-slate-900">Campaña:</span> {cart.campaignLabel}</p>
                <p><span className="font-medium text-slate-900">Medium:</span> {cart.utmMediumLabel}</p>
                <p><span className="font-medium text-slate-900">Term:</span> {cart.utmTermLabel}</p>
                <p><span className="font-medium text-slate-900">Content:</span> {cart.utmContentLabel}</p>
                <p><span className="font-medium text-slate-900">Landing:</span> {cart.landingPageLabel}</p>
                <p><span className="font-medium text-slate-900">Referrer:</span> {cart.referrerLabel}</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Orden vinculada</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Estado posterior:</span> {cart.statusAfterLabel}</p>
                <p><span className="font-medium text-slate-900">convertedOrderId:</span> {cart.convertedOrderId ?? ""}</p>
                <p><span className="font-medium text-slate-900">Order number:</span> {cart.convertedOrderNumber ?? ""}</p>
                <p><span className="font-medium text-slate-900">Order status:</span> {cart.orderStatusLabel}</p>
                <p><span className="font-medium text-slate-900">Payment status:</span> {cart.orderPaymentStatusLabel}</p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
