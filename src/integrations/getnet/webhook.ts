export type GetnetWebhookEnvelope = {
  order_id?: string;
  payment_intent_id?: string;
  payment?: {
    result?: {
      status?: string;
      payment_id?: string;
    };
    installment?: {
      number?: number;
    };
  };
};
