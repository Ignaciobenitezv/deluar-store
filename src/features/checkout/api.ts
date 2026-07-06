import type { CheckoutFormValues } from "@/features/checkout/types";
import type { EnabledCheckoutPaymentMethod } from "@/features/payments/types";
import type { CreateOrderResult, Order } from "@/features/order/types";
import type { ShippingMethod } from "@/features/shipping/shipping";

type CreateCheckoutOrderInput = {
  customer: CheckoutFormValues;
  items: {
    slug: string;
    quantity: number;
  }[];
  shippingMethod?: ShippingMethod;
  paymentMethod?: EnabledCheckoutPaymentMethod;
};

export async function createCheckoutOrder(
  input: CreateCheckoutOrderInput,
): Promise<{ order: Order }> {
  const response = await fetch("/api/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as CreateOrderResult | {
    ok?: false;
    errors?: string[];
  };

  if (!response.ok || !("ok" in result) || !result.ok) {
    const errors =
      "errors" in result && Array.isArray(result.errors) && result.errors.length > 0
        ? result.errors
        : ["No se pudo crear la orden en este momento."];

    throw new Error(errors.join(" "));
  }

  return {
    order: result.order,
  };
}
