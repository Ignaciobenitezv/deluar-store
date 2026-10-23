import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";
import { RichText } from "@/features/storefront-copy/components/rich-text";
import { getStorefrontCopy } from "@/features/storefront-copy/server/get-storefront-copy";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getStorefrontCopy();

  return buildMetadata({
    title: copy.pageHowToBuy.seoTitle,
    description: copy.pageHowToBuy.seoDescription,
    path: "/como-comprar",
  });
}

export default async function ComoComprarPage() {
  // Texts from Configuración → Textos; the steps are one per line.
  const { copy } = await getStorefrontCopy();
  const page = copy.pageHowToBuy;
  const steps = page.steps.split("\n").filter(Boolean);

  return (
    <SiteContainer className="py-10 sm:py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground transition-colors">{copy.navigation.home}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <div className="max-w-2xl">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {page.title}
        </h1>

        <section className="mb-10">
          <h2 className="mb-5 text-base font-semibold text-foreground">{page.stepsTitle}</h2>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-4 text-sm leading-relaxed text-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-5 text-base font-semibold text-foreground">{page.extraTitle}</h2>
          <RichText source={page.extra} />
        </section>
      </div>
    </SiteContainer>
  );
}
