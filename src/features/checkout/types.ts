import type { PaymentMethod } from "@/features/payments/types";

export type CheckoutFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  paymentMethod: PaymentMethod;
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
