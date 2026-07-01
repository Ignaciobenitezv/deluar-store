export type UnicobrosCheckoutCustomer = {
  email: string;
  name: string;
  identification: string;
};

export type UnicobrosCreateCheckoutRequest = {
  total: number;
  description: string;
  currency: "ars";
  reference: string;
  customer: UnicobrosCheckoutCustomer;
  test?: boolean;
  return_url?: string;
  webhook?: string;
  items?: unknown[];
  sources?: unknown[];
  installments?: number;
  timeout?: number;
  addresses?: unknown;
};

export type UnicobrosCreateCheckoutResponse = {
  data?: {
    url?: string;
  };
  raw?: unknown;
};

export type UnicobrosWebhookPayload = Record<string, unknown>;
