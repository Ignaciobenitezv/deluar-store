import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { shouldIndexSite } from "@/lib/deployment";

export default function robots(): MetadataRoute.Robots {
  if (!shouldIndexSite) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/carrito", "/checkout", "/studio"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
