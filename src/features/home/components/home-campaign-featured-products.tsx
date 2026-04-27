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
    <section>
      <div className="mx-auto grid max-w-[84.5rem] grid-cols-2 gap-x-2.5 gap-y-3.5 lg:grid-cols-4 lg:gap-x-2.5 lg:gap-y-4">
        {campaign.products.map((product) => (
          <article
            key={product.id}
            className="group w-full min-w-0 overflow-hidden rounded-[0.28rem] border border-[#ece7e1] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:border-[#ddd6cc] hover:shadow-[0_6px_14px_rgba(0,0,0,0.08)]"
          >
            <Link href={product.productHref} className="block">
              <div className="relative aspect-square overflow-hidden bg-neutral-100 p-3 sm:h-[22.5rem] sm:bg-[#f1e9de] sm:p-0 lg:h-[23.7rem]">
                {product.imageUrl ? (
                  <>
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.015] group-hover:opacity-0"
                    />
                    {product.hoverImageUrl ? (
                      <Image
                        src={product.hoverImageUrl}
                        alt={product.hoverImageAlt || product.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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
                  <h3 className="truncate text-sm font-medium">
                    {product.title}
                  </h3>
                </Link>
              </div>

              <div className="space-y-0.5">
                <p className="text-base font-semibold sm:text-lg">
                  {formatPrice(product.basePrice)}
                </p>
                {product.transferPrice ? (
                  <p className="text-sm text-neutral-500 sm:text-base">
                    Transferencia: {formatPrice(product.transferPrice)}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
