import Link from "next/link";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import type { CatalogProductCard } from "@/features/catalog/types";

type HomeFeaturedProductsProps = {
  products: CatalogProductCard[];
};

export function HomeFeaturedProducts({ products }: HomeFeaturedProductsProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            Productos destacados
          </p>
          <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
            Seleccion curada para DELUAR
          </h2>
        </div>

        <Link
          href="/productos"
          className="inline-flex text-sm uppercase tracking-[0.22em] text-foreground/82 transition-colors hover:text-foreground"
        >
          Ver todos
        </Link>
      </div>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="rounded-[1.7rem] border border-border/80 bg-surface/92 px-6 py-8 text-sm leading-7 text-muted">
          No hay productos destacados cargados todavia. Puedes marcarlos desde Sanity
          con el campo de destacado o seleccionarlos en la pagina de inicio.
        </div>
      )}
    </section>
  );
}
