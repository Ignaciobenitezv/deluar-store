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
import { calculateTransferPrice, isValidCommercialPrice } from "@/features/pricing/commercial-pricing";
import type { CatalogProductCard } from "@/features/catalog/types";

function formatPrice(value: number) {
  return formatProductPrice(value);
}

function TransferTagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 12.5 12.5 20a1.5 1.5 0 0 1-2.12 0l-6.38-6.38a1.5 1.5 0 0 1 0-2.12L11.5 4H19a1 1 0 0 1 1 1v7.5Z" />
      <circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
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
  const transferDiscountedPrice = isValidCommercialPrice(product.basePrice)
    ? calculateTransferPrice(product.basePrice)
    : null;

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
      {/* aspect-[4/5]: taller than the previous 1.28:1 (catalog) / 1:1
          (default) crops, so the photo carries more of the card and — since
          card images are already requested from Sanity close to this same
          portrait ratio (see product-commercial-display.ts) — object-cover
          needs to crop much less to fill the frame, avoiding an
          exaggeratedly zoomed-in result. */}
      <div
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden",
          isCatalogVariant ? "bg-[#f4eadf]" : "bg-neutral-100 sm:bg-[#efe5d8]",
        )}
      >
        <ProductCardImageStack
          href={product.productHref}
          images={product.images}
          imageUrl={product.imageUrl}
          imageAlt={product.imageAlt}
          hoverImageUrl={product.hoverImageUrl}
          sizes={
            isCatalogVariant
              ? "(min-width: 1280px) 33vw, (min-width: 768px) 33vw, 100vw"
              : "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          }
          imageClassName="object-cover"
          placeholderClassName="text-sm uppercase tracking-[0.24em] text-muted"
        />
      </div>

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
            ? "min-h-[2.75rem] line-clamp-2 text-[1rem] leading-[1.2]"
            : "truncate text-sm",
        )}
            >
              {product.title}
            </h2>
          </Link>
        </div>

        <div className={cn(isCatalogVariant ? "space-y-1.5" : "space-y-0.5")}>
          <p
            className={cn(
              "leading-none",
              isCatalogVariant
                ? "text-xl font-bold text-[#3a2a22] sm:text-2xl"
                : "text-[0.96rem] font-semibold text-neutral-900",
            )}
          >
            {product.pricePrefix ? `${product.pricePrefix} ` : null}
            {formatPrice(product.basePrice)}
          </p>
          {isCatalogVariant && transferDiscountedPrice !== null ? (
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f1e2d2] px-2.5 py-1 text-[11px] font-medium text-[#5b4033] sm:text-xs">
              <TransferTagIcon />
              <span className="truncate">
                Transferencia {formatPrice(transferDiscountedPrice)} · 20% OFF
              </span>
            </div>
          ) : null}
          {showCommerceEnhancements ? (
            <p className={cn("leading-tight text-neutral-500", isCatalogVariant ? "text-xs sm:text-[13px]" : "text-[11px]")}>
              6 cuotas sin interés de {formatInstallmentPrice(product.basePrice)}
            </p>
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
                isCatalogVariant ? "w-full overflow-hidden" : "w-full items-center overflow-hidden pt-2",
                !isCatalogVariant && product.hasSelectableOptions
                  ? "justify-end"
                  : !isCatalogVariant
                    ? "justify-between gap-1.5"
                    : undefined,
              )}
              buttonClassName={
                isCatalogVariant
                  ? "w-full min-w-0"
                  : "h-7 min-w-0 px-2.5 text-[10px] sm:px-2.5 sm:text-[10px]"
              }
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
