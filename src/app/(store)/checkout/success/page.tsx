import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/features/order/components/order-status-badge";
import { OrderTimeline } from "@/features/order/components/order-timeline";
import { PostCheckoutDetails } from "@/features/checkout/components/post-checkout-details";
import {
  buildPostCheckoutContext,
  type PostCheckoutSearchParams,
} from "@/features/checkout/post-checkout-context";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<PostCheckoutSearchParams>;
};

export const metadata: Metadata = {
  title: "Checkout confirmado",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const context = buildPostCheckoutContext(resolvedSearchParams);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-5 rounded-[1.5rem] border border-border/80 bg-surface px-6 py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          Confirmación recibida
        </h1>
        <OrderStatusBadge status="PAID" />
        <p className="text-sm leading-7 text-muted">
          Recibimos una confirmación del proceso de pago. Si el proveedor aún tiene
          una actualización pendiente, la orden se sincronizará apenas llegue el
          aviso final.
        </p>
        <PostCheckoutDetails
          context={context}
          title="Resumen del retorno"
          description="Estos datos ayudan a identificar la respuesta del proveedor o el resultado del redireccionamiento."
        />
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
