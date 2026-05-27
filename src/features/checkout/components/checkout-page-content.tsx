"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/features/cart/cart-context";
import { createCheckoutOrder } from "@/features/checkout/api";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { CheckoutOrderSummary } from "@/features/checkout/components/checkout-order-summary";
import type { CheckoutFormValues } from "@/features/checkout/types";
import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payments/types";
import type { Order } from "@/features/order/types";

type CheckoutPageContentProps = {
  isReview?: boolean;
  reviewPaymentMessage?: string;
};

export function CheckoutPageContent({
  isReview = false,
  reviewPaymentMessage = "Esta versión es de prueba. Los pagos todavía no están habilitados.",
}: CheckoutPageContentProps) {
  const { items } = useCart();
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const getPaymentMethodLabel = (paymentMethod: PaymentMethod) => {
    if (paymentMethod === PAYMENT_METHODS.TRANSFER) {
      return "Transferencia bancaria";
    }

    if (paymentMethod === PAYMENT_METHODS.GETNET) {
      return "Getnet";
    }

    return "GoCuotas";
  };

  const handleCreateOrder = async (values: CheckoutFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await createCheckoutOrder({
        customer: values,
        items: items.map((item) => ({
          slug: item.slug,
          quantity: item.quantity,
        })),
        paymentMethod: values.paymentMethod,
      });

      setCreatedOrder(result.order);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la orden. Intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      createdOrder?.paymentMethod === PAYMENT_METHODS.GOCUOTAS &&
      createdOrder.checkoutUrl
    ) {
      window.location.href = createdOrder.checkoutUrl;
    }
  }, [createdOrder]);

  if (items.length === 0) {
    return (
      <section className="rounded-[1.8rem] border border-border/80 bg-surface/92 px-6 py-10 text-center sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
          <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground sm:text-4xl">
            Tu carrito esta vacio
          </h1>
          <p className="text-sm leading-7 text-muted sm:text-base">
            Para avanzar al checkout primero necesitas agregar productos desde el
            catalogo o el detalle de producto.
          </p>
          <Link
            href="/productos"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
          >
            Ir a productos
          </Link>
        </div>
      </section>
    );
  }

  if (createdOrder) {
    return (
      <section className="space-y-8">
        <div className="rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.97),rgba(245,239,230,0.94))] px-6 py-8 shadow-[0_24px_60px_rgba(58,40,26,0.05)] sm:px-8">
          {isReview ? (
            <div className="mb-6 rounded-[1.3rem] border border-[var(--color-accent-strong)]/25 bg-[rgba(167,88,60,0.07)] px-5 py-4 text-sm font-medium leading-6 text-foreground">
              {reviewPaymentMessage}
            </div>
          ) : null}

          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Orden creada
            </p>
            <h1 className="text-4xl font-semibold tracking-[0.03em] text-foreground sm:text-[2.9rem] sm:leading-[1.05]">
              Tu pedido ya fue creado correctamente
            </h1>
            <p className="text-sm leading-7 text-muted sm:text-base">
              La orden ya existe en backend y quedo pendiente de pago con el metodo
              seleccionado. La integracion externa se conectara en el siguiente paso.
            </p>
          </div>

          <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-border/75 bg-white/72 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Numero</p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {createdOrder.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Estado</p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {createdOrder.status}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Pago</p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {getPaymentMethodLabel(createdOrder.paymentMethod)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Cliente</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {createdOrder.customer.firstName} {createdOrder.customer.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Email</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {createdOrder.customer.email}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-border/75 bg-white/72 p-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">
                Estado del pago
              </p>
              <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
                {createdOrder.checkoutUrl ? "Redirigiendo al pago" : "Pago pendiente"}
              </h2>
              <p className="text-sm leading-7 text-muted">
                {createdOrder.checkoutUrl
                  ? "Estamos abriendo el checkout seguro de GoCuotas."
                  : createdOrder.paymentMethod === PAYMENT_METHODS.TRANSFER
                  ? "La orden quedo registrada para coordinar los datos de transferencia."
                  : "La orden quedo preparada para conectar el redirect de GoCuotas."}
              </p>
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background/80 p-4 text-xs leading-6 text-muted">
              <p>Metodo: {getPaymentMethodLabel(createdOrder.paymentMethod)}</p>
              <p>Proveedor: {createdOrder.paymentProvider ?? "Sin proveedor externo"}</p>
              <p>Estado: {createdOrder.paymentStatus}</p>
              <p>Referencia: {createdOrder.orderNumber}</p>
              <p>Monto: {createdOrder.total}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/carrito"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/25"
            >
              Volver al carrito
            </Link>
            <button
              type="button"
              disabled={!createdOrder.checkoutUrl}
              onClick={() => {
                if (createdOrder.checkoutUrl) {
                  window.location.href = createdOrder.checkoutUrl;
                }
              }}
              className={
                createdOrder.checkoutUrl
                  ? "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
                  : "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white opacity-55"
              }
            >
              {createdOrder.checkoutUrl ? "Ir al pago" : "Continuar al pago"}
            </button>
          </div>
        </div>

        <CheckoutOrderSummary />
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {isReview ? (
        <section className="rounded-[1.5rem] border border-[var(--color-accent-strong)]/25 bg-[rgba(167,88,60,0.07)] px-6 py-5 sm:px-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
            Version de revision
          </p>
          <p className="mt-2 text-sm font-medium leading-7 text-foreground">
            {reviewPaymentMessage}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.95),rgba(243,236,227,0.92))] px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Checkout</p>
          <h1 className="text-4xl font-semibold tracking-[0.03em] text-foreground sm:text-[3.1rem] sm:leading-[1.04]">
            Datos para finalizar la compra
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
            Completa tus datos, crea tu orden y luego avanzamos al inicio de pago. El
            flujo ya valida la informacion y te muestra el estado de cada paso.
          </p>
        </div>
        <div className="grid gap-3 rounded-[1.5rem] border border-border/75 bg-white/70 px-5 py-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Paso 1</span>
            <span className="font-medium text-foreground">Datos y envio</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Paso 2</span>
            <span className="font-medium text-foreground">Orden</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Paso 3</span>
            <span className="font-medium text-foreground">Pago</span>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
        <div className="space-y-5">
          <CheckoutForm onSubmit={handleCreateOrder} isSubmitting={isSubmitting} />

          {submitError ? (
            <section className="rounded-[1.7rem] border border-[var(--color-accent-strong)]/25 bg-[rgba(167,88,60,0.06)] px-6 py-5 sm:px-8">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                  Error
                </p>
                <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
                  No se pudo crear la orden
                </h2>
                <p className="text-sm leading-7 text-muted">{submitError}</p>
              </div>
            </section>
          ) : null}
        </div>

        <CheckoutOrderSummary />
      </div>
    </div>
  );
}
