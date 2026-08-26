import Link from "next/link";
import {
  formatInstallmentPrice,
  formatProductPrice,
} from "@/features/catalog/components/product-card-formatting";
import {
  ProductCardActions,
} from "@/features/catalog/components/product-card-commerce";
import { ProductCardImageStack } from "@/features/catalog/components/product-card-image-stack";
import type { HomeCampaignFeatured } from "@/features/home/types";

type HomeCampaignFeaturedProductsProps = {
  campaign: HomeCampaignFeatured;
};

function formatPrice(value: number) {
  return formatProductPrice(value);
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
            <div className="relative aspect-square overflow-hidden bg-neutral-100 p-3 sm:h-[22.5rem] sm:bg-[#f1e9de] sm:p-0 lg:h-[23.7rem]">
              <ProductCardImageStack
                href={product.productHref}
                images={product.images}
                imageUrl={product.imageUrl}
                imageAlt={product.imageAlt}
                hoverImageUrl={product.hoverImageUrl}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                imageClassName="object-cover"
                placeholder={<div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.94),rgba(206,186,166,0.92))]" />}
              />
            </div>

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
                <p className="text-[11px] text-neutral-500 sm:text-xs">
                  6 cuotas sin interés de {formatInstallmentPrice(product.basePrice)}
                </p>
                {product.transferPrice ? (
                  <p className="text-sm font-medium text-[#b51429] sm:text-base">
                    Transferencia: {formatPrice(product.transferPrice)}
                  </p>
                ) : null}
              </div>

              <div className="pt-1">
                <ProductCardActions product={product} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
