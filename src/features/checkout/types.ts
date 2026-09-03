import type { EnabledCheckoutPaymentMethod } from "@/features/payments/types";
import type { ShippingMethod } from "@/features/shipping/shipping";

export type CheckoutFormValues = {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  phoneAreaCode: string;
  phoneNumber: string;
  street: string;
  streetNumber: string;
  floor: string;
  apartment: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  shippingMethod: ShippingMethod;
  paymentMethod: EnabledCheckoutPaymentMethod;
};

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormValues, string>>;

export type CheckoutSubmission = {
  customer: CheckoutFormValues;
  items: {
    id: string;
    slug: string;
    title: string;
    quantity: number;
    basePrice: number;
    transferPrice?: number;
  }[];
  subtotal: number;
};
