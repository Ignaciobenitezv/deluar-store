import Image from "next/image";
import Link from "next/link";
import type { HomeCampaignFeatured } from "@/features/home/types";

type HomeCampaignFeaturedProductsProps = {
  campaign: HomeCampaignFeatured;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeCampaignFeaturedProducts({
  campaign,
}: HomeCampaignFeaturedProductsProps) {
  if (campaign.products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6 sm:space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[38rem] space-y-2.5">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
            Destacados de la tienda
          </p>
          <h2 className="text-[1.45rem] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-[1.8rem]">
            {campaign.title}
          </h2>
          <p className="text-sm leading-6 text-muted sm:text-[0.95rem]">
            {campaign.text}
          </p>
        </div>

        {campaign.ctaLabel && campaign.ctaHref ? (
          <Link
            href={campaign.ctaHref}
            className="inline-flex items-center text-[0.72rem] uppercase tracking-[0.22em] text-foreground/82 transition-colors hover:text-foreground"
          >
            {campaign.ctaLabel}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {campaign.products.map((product) => (
          <article
            key={product.id}
            className="group overflow-hidden rounded-[1.4rem] border border-[#ddd4ca] bg-[linear-gradient(180deg,rgba(255,251,246,0.96),rgba(245,238,230,0.92))] transition-colors duration-300 hover:border-[#cfc3b4]"
          >
            <Link href={product.productHref} className="block">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#ece1d4]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.imageAlt}
                    fill
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-[0.7rem] uppercase tracking-[0.2em] text-muted">
                    Sin imagen
                  </div>
                )}
              </div>
            </Link>

            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-muted">
                  {product.categoryTitle}
                </p>
                <Link href={product.productHref} className="block">
                  <h3 className="line-clamp-2 text-[1rem] font-medium leading-[1.18] tracking-[0.01em] text-foreground">
                    {product.title}
                  </h3>
                </Link>
                <p className="line-clamp-2 text-sm leading-6 text-muted">
                  {product.shortDescription}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[1rem] font-semibold text-foreground">
                  {formatPrice(product.basePrice)}
                </p>
                {product.transferPrice ? (
                  <p className="text-sm text-muted">
                    Transferencia: {formatPrice(product.transferPrice)}
                  </p>
                ) : null}
              </div>

              <Link
                href={product.productHref}
                className="inline-flex items-center text-[0.72rem] uppercase tracking-[0.22em] text-foreground/82 transition-colors hover:text-foreground"
              >
                Ver producto
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
