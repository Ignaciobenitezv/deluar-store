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
    <section className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[28rem] space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
            Destacados de la tienda
          </p>
          <h2 className="text-[0.98rem] font-semibold leading-none tracking-tight text-foreground sm:text-[1.08rem]">
            {campaign.title}
          </h2>
          <p className="max-w-[25rem] text-[0.76rem] leading-[1.45] text-muted">
            {campaign.text}
          </p>
        </div>

        {campaign.ctaLabel && campaign.ctaHref ? (
          <Link
            href={campaign.ctaHref}
            className="inline-flex items-center text-[0.6rem] uppercase tracking-[0.16em] text-foreground/76 transition-colors hover:text-foreground"
          >
            {campaign.ctaLabel}
          </Link>
        ) : null}
      </div>

      <div className="mx-auto grid max-w-[73.5rem] grid-cols-2 gap-x-2.5 gap-y-3.5 lg:grid-cols-4 lg:gap-x-3 lg:gap-y-4">
        {campaign.products.map((product) => (
          <article
            key={product.id}
            className="group w-full min-w-0 overflow-hidden rounded-[0.28rem] border border-[#ece7e1] bg-white transition-colors duration-300 hover:border-[#ddd6cc]"
          >
            <Link href={product.productHref} className="block">
              <div className="relative h-[18.7rem] overflow-hidden bg-[#f1e9de] sm:h-[19.6rem] lg:h-[20.6rem]">
                {product.imageUrl ? (
                  <>
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.015] group-hover:opacity-0"
                    />
                    {product.hoverImageUrl ? (
                      <Image
                        src={product.hoverImageUrl}
                        alt={product.hoverImageAlt || product.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                    Sin imagen
                  </div>
                )}
              </div>
            </Link>

            <div className="space-y-1.5 px-2.5 py-2">
              <div className="space-y-0.5">
                <p className="text-[0.54rem] uppercase tracking-[0.14em] text-muted/72">
                  {product.categoryTitle}
                </p>
                <Link href={product.productHref} className="block">
                  <h3 className="line-clamp-2 min-h-[1.8rem] text-[0.72rem] font-medium leading-tight tracking-[0.002em] text-foreground sm:text-[0.76rem]">
                    {product.title}
                  </h3>
                </Link>
              </div>

              <div className="space-y-0.5">
                <p className="text-[0.8rem] font-semibold leading-none text-foreground sm:text-[0.84rem]">
                  {formatPrice(product.basePrice)}
                </p>
                {product.transferPrice ? (
                  <p className="text-[0.62rem] leading-[1.25] text-muted">
                    Transferencia: {formatPrice(product.transferPrice)}
                  </p>
                ) : null}
              </div>

              <Link
                href={product.productHref}
                className="inline-flex items-center text-[0.56rem] uppercase tracking-[0.14em] text-foreground/74 transition-colors hover:text-foreground"
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
