import Image from "next/image";
import Link from "next/link";
import type { CatalogProductCard } from "@/features/catalog/types";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

type ProductCardProps = {
  product: CatalogProductCard;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-border/80 bg-surface/90 transition-colors hover:border-foreground/15">
      <Link href={product.productHref} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#efe5d8]">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-[0.24em] text-muted">
              Sin imagen
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-4 px-5 py-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            {product.categoryTitle}
          </p>
          <Link href={product.productHref} className="block">
            <h2 className="text-lg font-medium tracking-[0.03em] text-foreground">
              {product.title}
            </h2>
          </Link>
          <p className="text-sm leading-6 text-muted">{product.shortDescription}</p>
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
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
          className="inline-flex items-center text-sm uppercase tracking-[0.22em] text-foreground/82 transition-colors hover:text-foreground"
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
