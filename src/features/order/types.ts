import type { CheckoutFormValues } from "@/features/checkout/types";
import type { PaymentMethod, EnabledCheckoutPaymentMethod } from "@/features/payments/types";
import type { ShippingMethod } from "@/features/shipping/shipping";

export type OrderStatus =
  | "created"
  | "pending_payment"
  | "paid"
  | "payment_failed"
  | "cancelled"
  | "expired"
  | "fulfilled"
  | "refunded";

export type OrderCustomer = Pick<
  CheckoutFormValues,
  "firstName" | "lastName" | "email" | "phone" | "notes"
>;

export type OrderShippingAddress = Pick<
  CheckoutFormValues,
  "address" | "city" | "province" | "postalCode"
> & {
  apartment?: string;
};

export type OrderItem = {
  productId: string;
  productSlug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  unitPrice: number;
  transferPrice?: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  paymentMethod: PaymentMethod;
  paymentProvider?: "gocuotas" | "getnet" | "mercado_pago" | "unicobros";
  paymentStatus: "not_started" | "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "charged_back";
  externalReference?: string;
  checkoutUrl?: string;
  rawProviderStatus?: string;
  installments?: number;
  items: OrderItem[];
  subtotal: number;
  total: number;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  createdAt: string;
};

export type CreateOrderItemInput = {
  id?: string;
  slug?: string;
  quantity?: number;
  title?: string;
  basePrice?: number;
  transferPrice?: number;
};

export type CreateOrderInput = {
  customer?: Partial<CheckoutFormValues>;
  items?: CreateOrderItemInput[];
  shippingMethod?: ShippingMethod;
  paymentMethod?: EnabledCheckoutPaymentMethod;
};

export type CreateOrderResult =
  | {
      ok: true;
      order: Order;
    }
  | {
      ok: false;
      status: number;
      errors: string[];
    };
