export type GetnetInitPaymentRequest = {
  orderId: string;
};

export type GetnetInitPaymentResponse = {
  provider: "getnet";
  status: "payment_intent_created";
  orderId: string;
  orderNumber: string;
  paymentIntentId: string;
  checkoutUrl: string;
  amount: number;
};
