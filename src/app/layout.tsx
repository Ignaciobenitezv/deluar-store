import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { sanityFetch } from "@/integrations/sanity/client";
import { siteSettingsQuery } from "@/integrations/sanity/queries";
import type { SiteSettingsDocument } from "@/types/cms";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const siteSettings = await sanityFetch<SiteSettingsDocument | null>(siteSettingsQuery);
    const defaultTitle = siteSettings?.seo?.title || siteSettings?.siteName || siteConfig.name;
    const defaultDescription =
      siteSettings?.seo?.description ||
      siteSettings?.siteDescription ||
      siteConfig.description;

    return {
      metadataBase: new URL(siteConfig.url),
      title: {
        default: defaultTitle,
        template: `%s | ${siteConfig.name}`,
      },
      ...buildMetadata({
        description: defaultDescription,
      }),
    };
  } catch {
    return {
      metadataBase: new URL(siteConfig.url),
      title: {
        default: siteConfig.name,
        template: `%s | ${siteConfig.name}`,
      },
      ...buildMetadata({
        description: siteConfig.description,
      }),
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
