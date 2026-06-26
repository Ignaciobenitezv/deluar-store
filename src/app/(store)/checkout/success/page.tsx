import Link from "next/link";
import { OrderStatusBadge } from "@/features/order/components/order-status-badge";
import { OrderTimeline } from "@/features/order/components/order-timeline";

export default function CheckoutSuccessPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-4 rounded-[1.5rem] border border-border/80 bg-surface px-6 py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          Pago recibido
        </h1>
        <OrderStatusBadge status="PAID" />
        <p className="text-sm leading-7 text-muted">
          Recibimos la respuesta de GoCuotas. Si el pago ya fue confirmado, vamos a
          actualizar tu orden apenas llegue la notificacion del proveedor.
        </p>
        <OrderTimeline status="PAID" />
        <Link
          href="/productos"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white"
        >
          Seguir comprando
        </Link>
      </div>
    </section>
  );
}
