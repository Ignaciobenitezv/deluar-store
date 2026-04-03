import type { CheckoutFormValues } from "@/features/checkout/types";

export type OrderStatus = "draft" | "pending_payment";

export type OrderCustomer = Pick<
  CheckoutFormValues,
  "firstName" | "lastName" | "email" | "phone" | "notes"
>;

export type OrderShippingAddress = Pick<
  CheckoutFormValues,
  "address" | "city" | "province" | "postalCode"
>;

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
