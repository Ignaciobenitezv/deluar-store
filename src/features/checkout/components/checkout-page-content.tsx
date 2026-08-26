"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  clearAnalyticsCartId,
  getOrCreateAnalyticsCartId,
} from "@/features/analytics/client/cart-utils";
import {
  trackCheckoutInfoCompleted,
  trackCheckoutStarted,
} from "@/features/analytics/client/track-event";
import { useCart } from "@/features/cart/cart-context";
import { CheckoutOrderError, createCheckoutOrder } from "@/features/checkout/api";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { CheckoutOrderSummary } from "@/features/checkout/components/checkout-order-summary";
import { TransferPaymentInstructions } from "@/features/checkout/components/transfer-payment-instructions";
import { getInitialCheckoutFormValues } from "@/features/checkout/validation";
import { OrderStatusBadge } from "@/features/order/components/order-status-badge";
import { OrderTimeline } from "@/features/order/components/order-timeline";
import { getOrderStatusLabel } from "@/features/order/status";
import type { CheckoutFormValues } from "@/features/checkout/types";
import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payments/types";
import type { Order } from "@/features/order/types";
import { resolveCommercialSubtotal } from "@/features/pricing/commercial-pricing";
import { getShippingMethodLabel } from "@/features/shipping/shipping";

type CheckoutPageContentProps = {
  isReview?: boolean;
  reviewPaymentMessage?: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CheckoutPageContent({
  isReview = false,
    reviewPaymentMessage = "Esta versión es de prueba. Los pagos todavía no están habilitados.",
}: CheckoutPageContentProps) {
  const { items, clearCart } = useCart();
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [checkoutValues, setCheckoutValues] = useState<CheckoutFormValues>(
    getInitialCheckoutFormValues,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const clearedOrderIdRef = useRef<string | null>(null);
  const hasTrackedCheckoutStartedRef = useRef(false);
  const effectiveSubtotal = resolveCommercialSubtotal(items, checkoutValues.paymentMethod);

  const getPaymentMethodLabel = (paymentMethod: PaymentMethod) => {
    if (paymentMethod === PAYMENT_METHODS.TRANSFER) {
      return "Transferencia bancaria";
    }

    if (paymentMethod === PAYMENT_METHODS.UNICOBROS) {
      return "Unicobros";
    }

    return "GoCuotas";
  };

  const handleCreateOrder = async (values: CheckoutFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      trackCheckoutInfoCompleted({
        items,
        shippingMethod: values.shippingMethod,
        paymentMethod: values.paymentMethod,
      });

      const result = await createCheckoutOrder({
        customer: values,
        analyticsCartId: getOrCreateAnalyticsCartId(),
        items: items.map((item) => ({
          slug: item.slug,
          quantity: item.quantity,
          variantId: item.variantId,
          variantValue: item.variantValue,
          variantLabel: item.variantLabel,
          variantAttributes: item.variantAttributes,
          variantSku: item.sku,
        })),
        shippingMethod: values.shippingMethod,
        paymentMethod: values.paymentMethod,
      });

      setCreatedOrder(result.order);
      clearAnalyticsCartId();

      const canClearCart =
        Boolean(result.order.id) &&
        Boolean(result.order.orderNumber) &&
        ((result.order.paymentMethod !== PAYMENT_METHODS.GOCUOTAS &&
          result.order.paymentMethod !== PAYMENT_METHODS.UNICOBROS) ||
          Boolean(result.order.checkoutUrl));

      if (canClearCart && clearedOrderIdRef.current !== result.order.id) {
        clearedOrderIdRef.current = result.order.id;
        clearCart();
      }
    } catch (error) {
      if (error instanceof CheckoutOrderError && error.order) {
        clearAnalyticsCartId();
      }

      setSubmitError(
        error instanceof CheckoutOrderError ? error.message : "No se pudo crear la orden. Intentá nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (hasTrackedCheckoutStartedRef.current || items.length === 0) {
      return;
    }

    hasTrackedCheckoutStartedRef.current = true;
    trackCheckoutStarted({
      items,
      shippingMethod: checkoutValues.shippingMethod,
      paymentMethod: checkoutValues.paymentMethod,
    });
  }, [checkoutValues.paymentMethod, checkoutValues.shippingMethod, items]);

  useEffect(() => {
    if (
      (createdOrder?.paymentMethod === PAYMENT_METHODS.GOCUOTAS ||
        createdOrder?.paymentMethod === PAYMENT_METHODS.UNICOBROS) &&
      createdOrder.checkoutUrl
    ) {
      window.location.href = createdOrder.checkoutUrl;
    }
  }, [createdOrder]);

  if (createdOrder) {
    const isTransferOrder = createdOrder.paymentMethod === PAYMENT_METHODS.TRANSFER;
    const isPendingTransferOrder =
      isTransferOrder && createdOrder.paymentStatus === "pending";

    return (
      <section className="space-y-8">
        <div className="rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.97),rgba(245,239,230,0.94))] px-5 py-7 shadow-[0_24px_60px_rgba(58,40,26,0.05)] sm:px-8 sm:py-8">
          {isReview ? (
            <div className="mb-6 rounded-[1.3rem] border border-[var(--color-accent-strong)]/25 bg-[rgba(167,88,60,0.07)] px-5 py-4 text-sm font-medium leading-6 text-foreground">
              {reviewPaymentMessage}
            </div>
          ) : null}

          <div className="max-w-[34rem] space-y-3.5 sm:max-w-2xl sm:space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Orden creada
            </p>
            <h1 className="max-w-[18rem] text-[2rem] font-semibold leading-[1.08] tracking-[0.01em] text-foreground min-[390px]:max-w-[21rem] min-[390px]:text-[2.2rem] sm:max-w-none sm:text-[2.9rem] sm:leading-[1.05] sm:tracking-[0.03em]">
              Tu pedido ya fue creado correctamente
            </h1>
            <p className="text-sm leading-6 text-muted sm:text-base sm:leading-7">
              La orden ya existe en el sistema y quedó pendiente de pago con el método
              seleccionado. La integración externa se conectará en el siguiente paso.
            </p>
          </div>

          <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-border/75 bg-white/72 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Número</p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {createdOrder.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Estado</p>
              <div className="mt-2">
                <OrderStatusBadge
                  status={createdOrder.status}
                  className="min-h-8 border-[var(--color-accent-strong)]/30 bg-[rgba(96,71,56,0.08)] px-[1.125rem] py-1.5 text-[0.68rem] tracking-[0.14em] text-[var(--color-accent-strong)] sm:px-3 sm:py-1"
                />
              </div>
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
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Env??o</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {getShippingMethodLabel(createdOrder.shippingMethod)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Costo env??o</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {createdOrder.shippingCost === 0 ? "Gratis" : formatPrice(createdOrder.shippingCost)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Correo electr??nico</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {createdOrder.customer.email}
              </p>
            </div>
          </div>

          {isPendingTransferOrder ? (
            <div className="mt-6 sm:mt-10">
              <TransferPaymentInstructions order={createdOrder} />
            </div>
          ) : (
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
                    ? `Estamos abriendo la página segura de pago de ${getPaymentMethodLabel(createdOrder.paymentMethod)}.`
                    : `La orden quedó preparada para conectar la redirección de ${getPaymentMethodLabel(createdOrder.paymentMethod)}.`}
                </p>
              </div>

              <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background/80 p-4 text-xs leading-6 text-muted">
                <p>Método: {getPaymentMethodLabel(createdOrder.paymentMethod)}</p>
                <p>Env?o: {getShippingMethodLabel(createdOrder.shippingMethod)}</p>
                <p>
                                    Costo env?o: {createdOrder.shippingCost === 0 ? "Gratis" : formatPrice(createdOrder.shippingCost)}
                </p>
                <p>Proveedor: {createdOrder.paymentProvider ?? "Sin proveedor externo"}</p>
                <p>Estado: {getOrderStatusLabel(createdOrder.status)}</p>
                <p>Referencia: {createdOrder.orderNumber}</p>
                <p>Monto: {formatPrice(createdOrder.total)}</p>
              </div>
            </div>
          )}

          <div className="mt-7 sm:mt-10">
            <OrderTimeline
              status={createdOrder.status}
              paymentMethod={createdOrder.paymentMethod}
              paymentStatus={createdOrder.paymentStatus}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3.5 sm:mt-8 sm:gap-4">
            <Link
              href={isTransferOrder ? "/productos" : "/carrito"}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-foreground/25 sm:min-h-12 sm:w-auto sm:tracking-[0.22em]"
            >
              {isTransferOrder ? "Seguir comprando" : "Volver al carrito"}
            </Link>
            {!isTransferOrder ? (
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
            ) : null}
          </div>
        </div>

      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-[1.8rem] border border-border/80 bg-surface/92 px-6 py-10 text-center sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Finalizaci??n de compra</p>
          <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground sm:text-4xl">
                        Tu carrito est?? vac??o
          </h1>
          <p className="text-sm leading-7 text-muted sm:text-base">
            Para avanzar a la finalización de compra primero necesitas agregar productos
            desde el catálogo o el detalle de producto.
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

  return (
    <div className="space-y-10">
      {isReview ? (
        <section className="rounded-[1.5rem] border border-[var(--color-accent-strong)]/25 bg-[rgba(167,88,60,0.07)] px-6 py-5 sm:px-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
                        Versión de revisión
          </p>
          <p className="mt-2 text-sm font-medium leading-7 text-foreground">
            {reviewPaymentMessage}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.95),rgba(243,236,227,0.92))] px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Finalización de compra</p>
          <h1 className="text-4xl font-semibold tracking-[0.03em] text-foreground sm:text-[3.1rem] sm:leading-[1.04]">
            Datos para finalizar la compra
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
            Completá tus datos, creá tu orden y luego avanzamos al inicio de pago. El
            flujo ya valida la información y te muestra el estado de cada paso.
          </p>
        </div>
        <div className="grid gap-3 rounded-[1.5rem] border border-border/75 bg-white/70 px-5 py-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Paso 1</span>
            <span className="font-medium text-foreground">Datos y env??o</span>
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
          <CheckoutForm
            onSubmit={handleCreateOrder}
            onValuesChange={setCheckoutValues}
            isSubmitting={isSubmitting}
            subtotal={effectiveSubtotal}
          />

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

        <CheckoutOrderSummary
          shippingMethod={checkoutValues.shippingMethod}
          paymentMethod={checkoutValues.paymentMethod}
          subtotal={effectiveSubtotal}
        />
      </div>
    </div>
  );
}
