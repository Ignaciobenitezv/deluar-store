import "server-only";
import { sanityFetch } from "@/integrations/sanity/client";
import { siteSettingsQuery } from "@/integrations/sanity/queries";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import type { SiteSettingsDocument } from "@/types/cms";

export type AdminBusinessProfile = {
  name: string;
  contactEmail: string;
  whatsapp: string;
};

/** Nombre comercial / Email de contacto / WhatsApp already have a real
 * source: the Sanity `siteSettings` document (the same one the storefront
 * reads for SEO defaults). Razón social, CUIT, and the whole Domicilio card
 * have no source anywhere in the project — those stay empty, UI-only
 * placeholders until a real field exists to back them. */
export async function getAdminBusinessProfile(): Promise<AdminBusinessProfile> {
  try {
    const siteSettings = await sanityFetch<SiteSettingsDocument | null>(siteSettingsQuery);

    return {
      name: siteSettings?.siteName || siteConfig.name,
      contactEmail: siteSettings?.contactEmail ?? "",
      whatsapp: siteSettings?.whatsappNumber ?? "",
    };
  } catch {
    return { name: siteConfig.name, contactEmail: "", whatsapp: "" };
  }
}

export type AdminIntegrationStatus = "connected" | "pending" | "not_configured";

export type AdminIntegrationSummary = {
  id: string;
  name: string;
  description: string;
  status: AdminIntegrationStatus;
};

/** Status is derived from real env presence (src/lib/env.ts) — never
 * fabricated. Only services with an actual provider/client in the codebase
 * are listed: Getnet is a leftover payment-method constant with no provider
 * wired to it, and Andreani has no API credentials (it's a local Excel
 * export, already its own module at /admin/envios), so neither belongs on
 * a "connect this service" screen. */
export function getAdminIntegrations(): AdminIntegrationSummary[] {
  const gocuotasConfigured = Boolean(env.gocuotasEmail && env.gocuotasPassword);
  const gocuotasPartial = Boolean(env.gocuotasEmail || env.gocuotasPassword);

  const unicobrosEnabled = env.nextPublicEnableUnicobros === "true";
  const unicobrosConfigured = Boolean(env.unicobrosApiKey && env.unicobrosAccessToken);

  return [
    {
      id: "sanity",
      name: "Sanity",
      description: "Contenido editorial de la home y el catálogo.",
      status: env.sanityProjectId ? "connected" : "not_configured",
    },
    {
      id: "resend",
      name: "Resend",
      description: "Emails transaccionales y newsletter.",
      status: env.resendApiKey ? "connected" : "not_configured",
    },
    {
      id: "mercadopago",
      name: "MercadoPago",
      description: "Procesamiento de pagos con tarjeta.",
      status: env.mercadoPagoAccessToken ? "connected" : "not_configured",
    },
    {
      id: "gocuotas",
      name: "GoCuotas",
      description: "Pagos en cuotas — método por defecto del checkout.",
      status: gocuotasConfigured ? "connected" : gocuotasPartial ? "pending" : "not_configured",
    },
    {
      id: "unicobros",
      name: "Unicobros",
      description: "Método de pago con tarjeta alternativo.",
      status: !unicobrosEnabled ? "not_configured" : unicobrosConfigured ? "connected" : "pending",
    },
  ];
}
