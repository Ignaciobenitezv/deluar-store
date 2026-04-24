import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  variant?: "default" | "desktopCatalog";
};

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const isDesktopCatalog = variant === "desktopCatalog";

  return (
    <article className={cn("group", !isDesktopCatalog && "overflow-hidden rounded-[1.6rem] border border-border/80 bg-surface/90 transition-colors hover:border-foreground/15")}>
      <Link href={product.productHref} className="block">
        <div className={cn("relative aspect-[4/5] overflow-hidden", isDesktopCatalog ? "rounded-lg bg-[#f4ede4]" : "bg-[#efe5d8]")}>
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

      <div className={cn(isDesktopCatalog ? "mt-3 space-y-1" : "space-y-4 px-5 py-5")}>
        <div className={cn(isDesktopCatalog ? "space-y-1" : "space-y-2")}>
          <p className={cn("text-xs uppercase text-muted", isDesktopCatalog ? "tracking-[0.12em] text-neutral-500" : "tracking-[0.22em]")}>
            {product.categoryTitle}
          </p>
          <Link href={product.productHref} className="block">
            <h2 className={cn("font-medium text-foreground", isDesktopCatalog ? "text-sm tracking-[0.01em]" : "text-lg tracking-[0.03em]")}>
              {product.title}
            </h2>
          </Link>
          {!isDesktopCatalog ? (
            <p className="text-sm leading-6 text-muted">{product.shortDescription}</p>
          ) : null}
        </div>

        <div className={cn(isDesktopCatalog ? "space-y-0.5" : "space-y-1")}>
          <p className={cn("text-foreground", isDesktopCatalog ? "text-sm" : "text-base font-semibold")}>
            {formatPrice(product.basePrice)}
          </p>
          {!isDesktopCatalog && product.transferPrice ? (
            <p className="text-sm text-muted">
              Transferencia: {formatPrice(product.transferPrice)}
            </p>
          ) : null}
        </div>

        {!isDesktopCatalog ? (
          <Link
            href={product.productHref}
            className="inline-flex items-center text-sm uppercase tracking-[0.22em] text-foreground/82 transition-colors hover:text-foreground"
          >
            Ver producto
          </Link>
        ) : null}
      </div>
    </article>
  );
}
