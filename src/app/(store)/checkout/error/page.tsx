import Link from "next/link";

export default function CheckoutErrorPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-4 rounded-[1.5rem] border border-border/80 bg-surface px-6 py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          Pago rechazado
        </h1>
        <p className="text-sm leading-7 text-muted">
          Podés volver al carrito y reintentar el pago o elegir otro método cuando
          el flujo quede habilitado.
        </p>
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
