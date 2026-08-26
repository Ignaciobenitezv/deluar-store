import "server-only";

import { sanityWriteClient } from "@/integrations/sanity/client";

export class AdminProductsWriteUnavailableError extends Error {
  constructor() {
    super("No hay credenciales de escritura de Sanity configuradas.");
    this.name = "AdminProductsWriteUnavailableError";
  }
}

export function getAdminProductsWriteClient() {
  if (!sanityWriteClient) {
    throw new AdminProductsWriteUnavailableError();
  }

  return sanityWriteClient;
}
