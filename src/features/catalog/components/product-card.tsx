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
  variant?: "default" | "desktopCatalog" | "catalogMobile";
};

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const isDesktopCatalog = variant === "desktopCatalog";
  const isCatalogMobile = variant === "catalogMobile";
  const isDefaultCatalog = variant === "default";

  return (
    <article
      className={cn(
        "group",
        isDesktopCatalog &&
          "overflow-hidden rounded-[10px] border border-neutral-200/50 bg-neutral-50/30 shadow-none",
        isCatalogMobile &&
          "overflow-hidden rounded-[8px] border border-neutral-200/40 bg-neutral-50/20 shadow-none",
        isDefaultCatalog &&
          "overflow-hidden rounded-[8px] border border-neutral-200/40 bg-neutral-50/20 shadow-none sm:rounded-[10px] sm:border-neutral-200/50 sm:bg-neutral-50/30",
      )}
    >
      <Link href={product.productHref} className="block">
        <div
          className={cn(
            "relative w-full overflow-hidden",
            isCatalogMobile
              ? "aspect-square rounded-none bg-[#efe5d8]"
              : "aspect-square rounded-none bg-neutral-100 p-3 sm:bg-[#efe5d8] sm:p-0",
          )}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className={cn(
                "h-full w-full rounded-none transition-transform duration-500 group-hover:scale-[1.03]",
                isCatalogMobile ? "object-cover" : "object-contain sm:object-cover",
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-[0.24em] text-muted">
              Sin imagen
            </div>
          )}
        </div>
      </Link>

      <div
        className={cn(
          isDesktopCatalog
            ? "space-y-1.5 px-3 pb-4 pt-3"
            : "space-y-1 px-1.5 pb-2 pt-2 sm:space-y-1.5 sm:px-3 sm:pb-4 sm:pt-3",
        )}
      >
        <div className="w-full overflow-hidden">
          <Link href={product.productHref} className="block">
            <h2
              title={product.title}
              className="truncate text-sm font-medium text-neutral-800"
            >
              {product.title}
            </h2>
          </Link>
        </div>

        <div className="space-y-1 sm:space-y-0.5">
          <p
            className="text-sm font-semibold text-neutral-900 sm:text-base"
          >
            {formatPrice(product.basePrice)}
          </p>
          {!isDesktopCatalog && product.transferPrice ? (
            <p className="text-[11px] leading-tight text-neutral-500 sm:hidden">
              <span className="font-medium text-neutral-700">Transferencia:</span>{" "}
              {formatPrice(product.transferPrice)}
            </p>
          ) : null}
          {product.transferPrice ? (
            <p
              className={cn(
                "mt-1 hidden text-xs text-neutral-600 sm:block sm:text-sm",
                isDesktopCatalog && "block",
              )}
            >
              <span className="font-semibold">Transferencia:</span>{" "}
              {formatPrice(product.transferPrice)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
