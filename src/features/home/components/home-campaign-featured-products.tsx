import { ProductCard } from "@/features/catalog/components/product-card";
import type { HomeCampaignFeatured } from "@/features/home/types";

type HomeCampaignFeaturedProductsProps = {
  campaign: HomeCampaignFeatured;
};

export function HomeCampaignFeaturedProducts({
  campaign,
}: HomeCampaignFeaturedProductsProps) {
  if (campaign.products.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mx-auto grid max-w-[84.5rem] grid-cols-2 gap-x-2.5 gap-y-3.5 lg:grid-cols-4 lg:gap-x-2.5 lg:gap-y-4">
        {/* Same card as /productos, so the promo band and actions match. */}
        {campaign.products.map((product, index) => (
          <div key={product.id} className="h-full w-full min-w-0">
            <ProductCard product={product} variant="desktopCatalog" staggerIndex={index} />
          </div>
        ))}
      </div>
    </section>
  );
}
