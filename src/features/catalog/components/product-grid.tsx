import { ProductCard } from "@/features/catalog/components/product-card";
import type { CatalogProductCard } from "@/features/catalog/types";

type ProductGridProps = {
  products: CatalogProductCard[];
  variant?: "default" | "desktopCatalog" | "catalogMobile";
};

export function ProductGrid({ products, variant = "default" }: ProductGridProps) {
  return (
    <section className={variant === "desktopCatalog" ? "grid grid-cols-4 gap-6" : "grid w-full grid-cols-2 gap-x-4 gap-y-6"}>
      {products.map((product) => (
        <div key={product.id} className="w-full min-w-0">
          <ProductCard product={product} variant={variant} />
        </div>
      ))}
    </section>
  );
}
