import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";
import { RichText } from "@/features/storefront-copy/components/rich-text";
import { getStorefrontCopy } from "@/features/storefront-copy/server/get-storefront-copy";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getStorefrontCopy();

  return buildMetadata({
    title: copy.pageReturns.title,
    description: copy.pageReturns.seoDescription,
    path: "/politica-de-devolucion",
  });
}

export default async function PoliticaDevolucionPage() {
  // The whole policy is edited in Configuración → Textos.
  const { copy } = await getStorefrontCopy();
  const page = copy.pageReturns;

  return (
    <SiteContainer className="py-10 sm:py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground transition-colors">{copy.navigation.home}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {page.title}
        </h1>
        <RichText source={page.body} />
      </div>
    </SiteContainer>
  );
}
