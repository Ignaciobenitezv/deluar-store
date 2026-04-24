import { ProductCard } from "@/features/catalog/components/product-card";
import type { CatalogProductCard } from "@/features/catalog/types";

type ProductGridProps = {
  products: CatalogProductCard[];
  variant?: "default" | "desktopCatalog";
};

export function ProductGrid({ products, variant = "default" }: ProductGridProps) {
  return (
    <section className={variant === "desktopCatalog" ? "grid grid-cols-4 gap-6" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} />
      ))}
    </section>
  );
}
