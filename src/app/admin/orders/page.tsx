import type { Metadata } from "next";
import Link from "next/link";
import { markTransferOrderPaidAction } from "@/app/admin/orders/actions";
import { requireAdminSession } from "@/features/admin/auth";
import { listOrders } from "@/features/orders/server/order-repository";
import { PAYMENT_METHODS } from "@/features/payments/types";
import { getShippingMethodLabel } from "@/features/shipping/shipping";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin ordenes",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isPendingTransfer(order: Awaited<ReturnType<typeof listOrders>>[number]) {
  return (
    order.paymentMethod === PAYMENT_METHODS.TRANSFER &&
    order.status === "pending_payment" &&
    order.paymentStatus === "pending"
  );
}

export default async function AdminOrdersPage() {
  await requireAdminSession();
  const orders = await listOrders(30);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Ordenes recientes</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            Dashboard
          </Link>
          <span className="text-sm text-muted-foreground">{orders.length} ordenes</span>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Orden</th>
              <th className="px-3 py-2 font-semibold">Cliente</th>
              <th className="px-3 py-2 font-semibold">Total</th>
              <th className="px-3 py-2 font-semibold">Envio</th>
              <th className="px-3 py-2 font-semibold">Metodo</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Accion</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{order.orderNumber}</td>
                <td className="px-3 py-2">
                  {order.customer.firstName} {order.customer.lastName}
                </td>
                <td className="px-3 py-2">{formatPrice(order.total)}</td>
                <td className="px-3 py-2">
                  <div>{getShippingMethodLabel(order.shippingMethod)}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}
                  </div>
                </td>
                <td className="px-3 py-2">{order.paymentMethod}</td>
                <td className="px-3 py-2">
                  {order.status} / {order.paymentStatus}
                </td>
                <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
                    >
                      Ver detalle
                    </Link>
                    {isPendingTransfer(order) ? (
                      <form action={markTransferOrderPaidAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button
                          type="submit"
                          className="rounded bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                        >
                          Marcar como pagada
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
