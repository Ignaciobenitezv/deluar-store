import type { Metadata } from "next";
import Link from "next/link";
import { PostCheckoutDetails } from "@/features/checkout/components/post-checkout-details";
import {
  buildPostCheckoutContext,
  type PostCheckoutSearchParams,
} from "@/features/checkout/post-checkout-context";

type CheckoutErrorPageProps = {
  searchParams?: Promise<PostCheckoutSearchParams>;
};

export const metadata: Metadata = {
  title: "Checkout con error",
};

export default async function CheckoutErrorPage({
  searchParams,
}: CheckoutErrorPageProps) {
  const resolvedSearchParams = await searchParams;
  const context = buildPostCheckoutContext(resolvedSearchParams);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-5 rounded-[1.5rem] border border-border/80 bg-surface px-6 py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          No se pudo completar el pago
        </h1>
        <p className="text-sm leading-7 text-muted">
          El proceso se interrumpió, fue rechazado o no pudo finalizarse. Podés
          volver al carrito y reintentar la compra o elegir otro método.
        </p>
        <PostCheckoutDetails
          context={context}
          title="Datos recibidos"
          description="Si la URL trajo información del retorno, la mostramos para que puedas identificar qué pasó."
        />
        <Link
          href="/carrito"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground"
        >
          Volver al carrito
        </Link>
      </div>
    </section>
  );
}
