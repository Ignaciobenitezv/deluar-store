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
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[31rem] space-y-1.5">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
            Destacados de la tienda
          </p>
          <h2 className="text-[1.08rem] font-semibold leading-none tracking-tight text-foreground sm:text-[1.18rem]">
            {campaign.title}
          </h2>
          <p className="text-[0.82rem] leading-5 text-muted">
            {campaign.text}
          </p>
        </div>

        {campaign.ctaLabel && campaign.ctaHref ? (
          <Link
            href={campaign.ctaHref}
            className="inline-flex items-center text-[0.66rem] uppercase tracking-[0.18em] text-foreground/78 transition-colors hover:text-foreground"
          >
            {campaign.ctaLabel}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 lg:grid-cols-4">
        {campaign.products.map((product) => (
          <article
            key={product.id}
            className="group overflow-hidden rounded-[0.45rem] border border-[#ebe6df] bg-white transition-colors duration-300 hover:border-[#ddd5ca]"
          >
            <Link href={product.productHref} className="block">
              <div className="relative aspect-[4/4.9] overflow-hidden bg-[#f1e9de]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                    Sin imagen
                  </div>
                )}
              </div>
            </Link>

            <div className="space-y-2.5 px-3 py-3 sm:px-3.5 sm:py-3.5">
              <div className="space-y-1">
                <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted/75">
                  {product.categoryTitle}
                </p>
                <Link href={product.productHref} className="block">
                  <h3 className="line-clamp-2 min-h-[2.15rem] text-[0.82rem] font-medium leading-[1.3] tracking-[0.002em] text-foreground sm:text-[0.86rem]">
                    {product.title}
                  </h3>
                </Link>
              </div>

              <div className="space-y-0.5">
                <p className="text-[0.92rem] font-semibold leading-none text-foreground sm:text-[0.96rem]">
                  {formatPrice(product.basePrice)}
                </p>
                {product.transferPrice ? (
                  <p className="text-[0.68rem] leading-4 text-muted">
                    Transferencia: {formatPrice(product.transferPrice)}
                  </p>
                ) : null}
              </div>

              <Link
                href={product.productHref}
                className="inline-flex items-center text-[0.62rem] uppercase tracking-[0.16em] text-foreground/76 transition-colors hover:text-foreground"
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
