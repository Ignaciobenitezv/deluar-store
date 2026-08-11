import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatInstallmentPrice,
  formatProductPrice,
} from "@/features/catalog/components/product-card-formatting";
import {
  ProductCardActions,
} from "@/features/catalog/components/product-card-commerce";
import { ProductCardImageStack } from "@/features/catalog/components/product-card-image-stack";
import type { CatalogProductCard } from "@/features/catalog/types";

function formatPrice(value: number) {
  return formatProductPrice(value);
}

type ProductCardProps = {
  product: CatalogProductCard;
  variant?: "default" | "desktopCatalog" | "catalogMobile";
  showCommerceEnhancements?: boolean;
};

export function ProductCard({
  product,
  variant = "default",
  showCommerceEnhancements = true,
}: ProductCardProps) {
  const isDesktopCatalog = variant === "desktopCatalog";
  const isCatalogMobile = variant === "catalogMobile";
  const isDefaultCatalog = variant === "default";
  const isCatalogVariant = isDesktopCatalog || isCatalogMobile;
  const hasStock = product.stock > 0;
  const stockLabel = hasStock ? "EN STOCK" : "SIN STOCK";

  return (
    <article
      className={cn(
        "group h-full",
        isCatalogVariant &&
          "flex flex-col overflow-hidden rounded-[12px] border border-[#e7d9c9] bg-white shadow-none",
        isDefaultCatalog &&
          "overflow-hidden rounded-[8px] border border-neutral-200/40 bg-neutral-50/20 shadow-none sm:rounded-[10px] sm:border-neutral-200/50 sm:bg-neutral-50/30",
      )}
    >
      <Link href={product.productHref} className="block">
        <div
          className={cn(
            "relative w-full overflow-hidden",
            isCatalogMobile
              ? "aspect-[1.28/1] bg-[#f4eadf]"
              : isDesktopCatalog
                ? "aspect-[1.28/1] bg-[#f4eadf]"
                : "aspect-square rounded-none bg-neutral-100 p-3 sm:bg-[#efe5d8] sm:p-0",
          )}
        >
          <ProductCardImageStack
            imageUrl={product.imageUrl}
            imageAlt={product.imageAlt}
            hoverImageUrl={product.hoverImageUrl}
            sizes={
              isCatalogVariant
                ? "(min-width: 1280px) 33vw, (min-width: 768px) 33vw, 100vw"
                : "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            }
            imageClassName={cn(
              isCatalogVariant ? "object-cover" : "object-contain sm:object-cover",
            )}
            placeholderClassName="text-sm uppercase tracking-[0.24em] text-muted"
          />
        </div>
      </Link>

      <div
        className={cn(
          isCatalogVariant
            ? "flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-3"
            : "space-y-1 px-1.5 pb-2 pt-2 sm:space-y-1.5 sm:px-3 sm:pb-4 sm:pt-3",
        )}
      >
        <div className="w-full overflow-hidden">
          <Link href={product.productHref} className="block">
            <h2
              title={product.title}
              className={cn(
                "font-semibold text-neutral-900",
                isCatalogVariant
                  ? "min-h-[2.6rem] line-clamp-2 text-[0.92rem] leading-[1.18]"
                  : "truncate text-sm",
              )}
            >
              {product.title}
            </h2>
          </Link>
        </div>

        <div className={cn(isCatalogVariant ? "min-h-[2.7rem]" : "")}>
          {product.shortDescription ? (
            <p
              className={cn(
                "text-[11px] leading-5 text-neutral-500",
                isCatalogVariant
                  ? "line-clamp-2 text-[0.84rem] leading-5"
                  : "line-clamp-2",
              )}
            >
              {product.shortDescription}
            </p>
          ) : null}
        </div>

        <div className="space-y-0.5">
          <p className="text-[0.96rem] font-semibold leading-none text-neutral-900">
            {formatPrice(product.basePrice)}
          </p>
          {showCommerceEnhancements ? (
            <p className="text-[11px] leading-tight text-neutral-500">
              6 cuotas sin interés de {formatInstallmentPrice(product.basePrice)}
            </p>
          ) : null}
          {isCatalogVariant ? (
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-[5px] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
                hasStock
                  ? "bg-[#f1e2d2] text-[#5b4033]"
                  : "bg-neutral-100 text-neutral-500",
              )}
            >
              {stockLabel}
            </span>
          ) : null}
          {!isCatalogVariant && product.transferPrice ? (
            <p
              className={cn(
                "text-[11px] leading-tight sm:hidden",
                showCommerceEnhancements ? "text-[#b51429]" : "text-neutral-500",
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  !showCommerceEnhancements && "text-neutral-700",
                )}
              >
                Transferencia:
              </span>{" "}
              {formatPrice(product.transferPrice)}
            </p>
          ) : null}
          {!isCatalogVariant && product.transferPrice ? (
            <p
              className={cn(
                "mt-1 hidden text-xs sm:block sm:text-sm",
                showCommerceEnhancements ? "text-[#b51429]" : "text-neutral-600",
                isDesktopCatalog && "block",
              )}
            >
              <span className="font-semibold">Transferencia:</span>{" "}
              {formatPrice(product.transferPrice)}
            </p>
          ) : null}
        </div>

        {showCommerceEnhancements ? (
          <div className="mt-auto pt-2">
            <ProductCardActions
              product={product}
              addLabel="Agregar al carrito"
              viewLabel="Ver producto"
              outOfStockLabel="Sin stock"
              variant={isCatalogVariant ? "catalog" : "default"}
              className={cn(
                isCatalogVariant
                  ? "w-full overflow-hidden"
                  : "w-full items-center overflow-hidden pt-2",
                !isCatalogVariant && product.hasSelectableOptions
                  ? "justify-end"
                  : !isCatalogVariant
                    ? "justify-between gap-1.5"
                    : undefined,
              )}
              buttonClassName={
                isCatalogVariant
                  ? "w-full min-w-0 !text-white"
                  : "h-7 min-w-0 px-2.5 text-[10px] sm:px-2.5 sm:text-[10px]"
              }
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
