export type GetnetInitPaymentRequest = {
  orderId: string;
};

export type GetnetPaymentPayload = {
  externalReference: string;
  amount: number;
  currency: "ARS";
  description: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: {
    title: string;
    quantity: number;
    unitPrice: number;
  }[];
  returnUrls: {
    success: string;
    failure: string;
    pending: string;
  };
};

export type GetnetInitPaymentResponse = {
  provider: "getnet";
  mode: "mock" | "live";
  status: "ready" | "requires_configuration";
  orderId: string;
  orderNumber: string;
  paymentPayload: GetnetPaymentPayload;
  checkoutUrl: string | null;
  message: string;
};
