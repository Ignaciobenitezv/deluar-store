import { ProductCard } from "@/features/catalog/components/product-card";
import type { CatalogProductCard } from "@/features/catalog/types";

type ProductGridProps = {
  products: CatalogProductCard[];
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  );
}
