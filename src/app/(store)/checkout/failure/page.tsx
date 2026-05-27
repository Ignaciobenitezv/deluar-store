import Link from "next/link";

export default function CheckoutFailurePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-4 rounded-[1.5rem] border border-border/80 bg-surface px-6 py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          No se pudo completar el pago
        </h1>
        <p className="text-sm leading-7 text-muted">
          La operacion no fue aprobada o se interrumpio antes de finalizar. Podes
          volver al carrito e intentar nuevamente.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/carrito"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white"
          >
            Volver al carrito
          </Link>
          <Link
            href="/productos"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground"
          >
            Ver productos
          </Link>
        </div>
      </div>
    </section>
  );
}
