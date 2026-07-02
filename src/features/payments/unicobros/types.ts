export type UnicobrosCheckoutCustomer = {
  email: string;
  name: string;
  identification: string;
};

export type UnicobrosCreateCheckoutRequest = {
  total: number;
  description: string;
  currency: "ARS";
  reference: string;
  customer: UnicobrosCheckoutCustomer;
  test?: boolean;
  return_url?: string;
  webhook?: string;
  items?: unknown[];
  sources?: unknown[];
  webhooksType?: "final" | "intermediateAndFinal";
  installments?: number;
  timeout?: number;
  addresses?: unknown;
};

export type UnicobrosCreateCheckoutResponse = {
  data?: {
    id?: string;
    url?: string;
  };
  raw?: unknown;
};

export type UnicobrosWebhookStatus = {
  code?: number | string;
  text?: string;
  message?: string;
};

export type UnicobrosWebhookPayload = {
  data?: {
    payment?: {
      reference?: string;
      id?: string | number;
      status?: UnicobrosWebhookStatus;
      updated?: string;
      source?: {
        transaction?: {
          transactionId?: string | number;
        };
      };
    };
    checkout?: {
      uid?: string;
    };
  };
  [key: string]: unknown;
};
