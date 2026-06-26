import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { markTransferOrderPaidAction } from "@/app/admin/orders/actions";
import { requireAdminSession } from "@/features/admin/auth";
import { getOrderById } from "@/features/orders/server/order-repository";
import { PAYMENT_METHODS } from "@/features/payments/types";
import { getShippingMethodLabel } from "@/features/shipping/shipping";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detalle de orden",
};

type AdminOrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isPendingTransfer(order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>) {
  return (
    order.paymentMethod === PAYMENT_METHODS.TRANSFER &&
    order.status === "pending_payment" &&
    order.paymentStatus === "pending"
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  await requireAdminSession();
  const { orderId } = await params;

  const order = await getOrderById(orderId);

  if (!order) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Volver a ordenes
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Orden no encontrada</h1>
      </main>
    );
  }

  const pendingTransfer = isPendingTransfer(order);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Volver a ordenes
          </Link>
          <h1 className="mt-3 text-2xl font-semibold">Orden {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">{formatDate(order.createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pendingTransfer ? (
            <form action={markTransferOrderPaidAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="rounded bg-foreground px-4 py-2 text-sm font-semibold text-background"
              >
                Marcar como pagada
              </button>
            </form>
          ) : null}
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="rounded border border-border px-4 py-2 text-sm font-semibold text-foreground"
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-border bg-surface p-4">
          <h2 className="text-base font-semibold">Cliente</h2>
          <div className="mt-4 space-y-4">
            <DetailRow
              label="Nombre"
              value={`${order.customer.firstName} ${order.customer.lastName}`.trim()}
            />
            <DetailRow label="Email" value={order.customer.email} />
            <DetailRow label="Telefono" value={order.customer.phone} />
          </div>
        </div>

        <div className="rounded border border-border bg-surface p-4">
          <h2 className="text-base font-semibold">Envio</h2>
          <div className="mt-4 space-y-4">
            <DetailRow label="Metodo" value={getShippingMethodLabel(order.shippingMethod)} />
            <DetailRow
              label="Costo"
              value={order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}
            />
            <DetailRow label="Direccion" value={order.shippingAddress.address} />
            <DetailRow label="Depto / piso" value={order.shippingAddress.apartment} />
            <DetailRow label="Localidad" value={order.shippingAddress.city} />
            <DetailRow label="Provincia" value={order.shippingAddress.province} />
            <DetailRow label="Codigo postal" value={order.shippingAddress.postalCode} />
          </div>
        </div>

        <div className="rounded border border-border bg-surface p-4">
          <h2 className="text-base font-semibold">Pago</h2>
          <div className="mt-4 space-y-4">
            <DetailRow label="Metodo" value={order.paymentMethod} />
            <DetailRow label="Estado de pago" value={order.paymentStatus} />
            <DetailRow label="Estado de orden" value={order.status} />
            <DetailRow label="Total" value={formatPrice(order.total)} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Productos comprados</h2>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <article
              key={`${item.productId}-${item.productSlug}`}
              className="grid gap-4 px-4 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_8rem]"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded bg-background">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt || item.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">Cantidad: {item.quantity}</p>
                <p className="mt-1 text-sm text-muted">
                  Precio unitario: {formatPrice(item.unitPrice)}
                </p>
                {item.transferPrice ? (
                  <p className="mt-1 text-sm text-muted">
                    Transferencia: {formatPrice(item.transferPrice)}
                  </p>
                ) : null}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Total</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatPrice(item.lineTotal)}
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="border-t border-border px-4 py-4 text-right">
          <p className="text-sm text-muted">Subtotal: {formatPrice(order.subtotal)}</p>
          <p className="mt-1 text-sm text-muted">
            Envio: {order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            Total: {formatPrice(order.total)}
          </p>
        </div>
      </section>
    </main>
  );
}
