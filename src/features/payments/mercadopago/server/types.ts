export type MercadoPagoCreatePreferenceInput = {
  orderId?: string;
};

export type MercadoPagoCreatePreferenceResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      preferenceId: string;
      initPoint: string;
    }
  | {
      ok: false;
      status: number;
      errors: string[];
    };
