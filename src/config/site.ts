import { env } from "@/lib/env";
import type { SiteConfig } from "@/types/site";

export const siteConfig: SiteConfig = {
  name: "DELUAR",
  description: "Ecommerce de hogar y decoracion construido con arquitectura desacoplada.",
  url: env.siteUrl,
};
