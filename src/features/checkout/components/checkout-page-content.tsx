"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/features/cart/cart-context";
import { createCheckoutOrder, initGetnetCheckoutPayment } from "@/features/checkout/api";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { CheckoutOrderSummary } from "@/features/checkout/components/checkout-order-summary";
import type { CheckoutFormValues } from "@/features/checkout/types";
import type { GetnetInitPaymentResponse } from "@/integrations/getnet/types";
import type { Order } from "@/features/order/types";

export function CheckoutPageContent() {
  const { items } = useCart();
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentInit, setPaymentInit] = useState<GetnetInitPaymentResponse | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);

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
    if (!createdOrder) {
      return;
    }

    let isActive = true;

    const run = async () => {
      try {
        setIsInitializingPayment(true);
        setPaymentError(null);

        const result = await initGetnetCheckoutPayment({
          orderId: createdOrder.id,
        });

        if (!isActive) {
          return;
        }

        setPaymentInit(result.payment);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPaymentError(
          error instanceof Error
            ? error.message
            : "No se pudo preparar el pago en este momento.",
        );
      } finally {
        if (isActive) {
          setIsInitializingPayment(false);
        }
      }
    };

    void run();

    return () => {
      isActive = false;
    };
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
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Orden creada
            </p>
            <h1 className="text-4xl font-semibold tracking-[0.03em] text-foreground sm:text-[2.9rem] sm:leading-[1.05]">
              Tu pedido ya fue creado correctamente
            </h1>
            <p className="text-sm leading-7 text-muted sm:text-base">
              La orden ya existe en backend y el checkout avanzo al paso de inicio de
              pago. Esta vista refleja el estado actual de la preparacion con Getnet.
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
              {isInitializingPayment ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
                    Iniciando pago
                  </h2>
                  <p className="text-sm leading-7 text-muted">
                    Estamos preparando la siguiente etapa del checkout con Getnet.
                  </p>
                </>
              ) : null}

              {!isInitializingPayment && paymentError ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
                    No se pudo iniciar el pago
                  </h2>
                  <p className="text-sm leading-7 text-muted">{paymentError}</p>
                </>
              ) : null}

              {!isInitializingPayment && paymentInit?.mode === "mock" ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
                    El pago no esta configurado todavia
                  </h2>
                  <p className="text-sm leading-7 text-muted">{paymentInit.message}</p>
                </>
              ) : null}

              {!isInitializingPayment && paymentInit?.mode === "live" ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
                    Pago listo para continuar
                  </h2>
                  <p className="text-sm leading-7 text-muted">{paymentInit.message}</p>
                </>
              ) : null}
            </div>

            {paymentInit ? (
              <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background/80 p-4 text-xs leading-6 text-muted">
                <p>Proveedor: {paymentInit.provider}</p>
                <p>Modo: {paymentInit.mode}</p>
                <p>Estado: {paymentInit.status}</p>
                <p>Referencia: {paymentInit.paymentPayload.externalReference}</p>
                <p>Monto: {paymentInit.paymentPayload.amount}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/carrito"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/25"
            >
              Volver al carrito
            </Link>
            {paymentInit?.mode === "live" && paymentInit.checkoutUrl ? (
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
              >
                Continuar al pago
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white opacity-55"
              >
                Continuar al pago
              </button>
            )}
          </div>
        </div>

        <CheckoutOrderSummary />
      </section>
    );
  }

  return (
    <div className="space-y-10">
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
