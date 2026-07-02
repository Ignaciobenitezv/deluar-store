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

export type UnicobrosWebhookPayload = Record<string, unknown>;
