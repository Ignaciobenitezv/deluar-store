import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/features/order/components/order-status-badge";
import { OrderTimeline } from "@/features/order/components/order-timeline";
import { PostCheckoutDetails } from "@/features/checkout/components/post-checkout-details";
import {
  buildPostCheckoutContext,
  type PostCheckoutSearchParams,
} from "@/features/checkout/post-checkout-context";

type CheckoutPendingPageProps = {
  searchParams?: Promise<PostCheckoutSearchParams>;
};

export const metadata: Metadata = {
  title: "Checkout pendiente",
};

export default async function CheckoutPendingPage({
  searchParams,
}: CheckoutPendingPageProps) {
  const resolvedSearchParams = await searchParams;
  const context = buildPostCheckoutContext(resolvedSearchParams);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-5 rounded-[1.5rem] border border-border/80 bg-surface px-6 py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          Estamos esperando la confirmación
        </h1>
        <OrderStatusBadge status="PENDING_PAYMENT" />
        <p className="text-sm leading-7 text-muted">
          La orden quedó creada, pero todavía estamos esperando la confirmación final
          del proveedor o la validación del medio de pago elegido.
        </p>
        <PostCheckoutDetails
          context={context}
          title="Detalle del retorno"
          description="Si el proveedor devolvió un estado, un tipo de evento o una referencia, la vas a ver acá."
        />
        <OrderTimeline status="PENDING_PAYMENT" />
        <Link
          href="/productos"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground"
        >
          Seguir navegando
        </Link>
      </div>
    </section>
  );
}
