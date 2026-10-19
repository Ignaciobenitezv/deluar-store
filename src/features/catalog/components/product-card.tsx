import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatInstallmentPrice,
  formatProductPrice,
  resolveTransferOffer,
} from "@/features/catalog/components/product-card-formatting";
import {
  ProductCardActions,
} from "@/features/catalog/components/product-card-commerce";
import { ProductCardImageStack } from "@/features/catalog/components/product-card-image-stack";
import { ProductCardBuyPill } from "@/features/catalog/components/product-card-buy-pill";
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
  const transferOffer = isCatalogVariant ? resolveTransferOffer(product) : null;

  return (
    <article
      className={cn(
        "group h-full",
        // Catalog cards are flat: photo, text and a small buy pill, no frame.
        isCatalogVariant && "flex flex-col",
        isDefaultCatalog &&
          "overflow-hidden rounded-[8px] border border-line/32 bg-canvas/8 shadow-none sm:rounded-[10px] sm:border-line/40 sm:bg-canvas/12",
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
          isCatalogVariant ? "bg-accent-soft/50" : "bg-canvas-alt/60 sm:bg-accent-soft/70",
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
          catalogGallery={isCatalogVariant}
        />
      </div>

      <div
        className={cn(
          isCatalogVariant
            ? "flex flex-1 flex-col pt-3"
            : "space-y-1 px-1.5 pb-2 pt-2 sm:space-y-1.5 sm:px-3 sm:pb-4 sm:pt-3",
        )}
      >
        <div className="w-full overflow-hidden">
          <Link href={product.productHref} className="block">
      <h2
        title={product.title}
        className={cn(
          isCatalogVariant
            ? "line-clamp-2 text-[0.85rem] font-normal leading-snug text-ink-muted sm:text-[0.95rem]"
            : "truncate text-sm font-semibold text-ink",
        )}
            >
              {product.title}
            </h2>
          </Link>
        </div>

        {isCatalogVariant ? (
          <div className="mt-3 flex flex-col gap-1">
            {/* With a transfer discount the list price steps back and the
                transfer price leads; without one the list price is the main
                price. */}
            <p
              className={cn(
                "leading-tight tabular-nums",
                transferOffer
                  ? "text-[0.75rem] text-ink-muted sm:text-[0.8rem]"
                  : "text-[0.9rem] font-bold sm:text-[1.05rem] text-ink",
              )}
            >
              {product.pricePrefix ? `${product.pricePrefix} ` : null}
              {formatPrice(product.basePrice)}
            </p>
            {showCommerceEnhancements ? (
              <p className="text-[0.9rem] font-bold sm:text-[1.05rem] leading-tight tabular-nums text-ink-muted">
                6 x {formatInstallmentPrice(product.basePrice)} sin interés
              </p>
            ) : null}
            {transferOffer ? (
              <p className="text-[0.9rem] font-bold sm:text-[1.05rem] leading-tight tabular-nums text-promo">
                {formatPrice(transferOffer.transferPrice)} con Transferencia
              </p>
            ) : null}
          </div>
        ) : (
        <div className="space-y-0.5">
          <p className="leading-none text-[0.96rem] font-semibold text-ink">
            {product.pricePrefix ? `${product.pricePrefix} ` : null}
            {formatPrice(product.basePrice)}
          </p>
          {showCommerceEnhancements ? (
            <p className="text-[11px] leading-tight text-ink-muted">
              6 cuotas sin interés de {formatInstallmentPrice(product.basePrice)}
            </p>
          ) : null}
          {!isCatalogVariant && product.transferPrice ? (
            <p
              className={cn(
                "text-[11px] leading-tight sm:hidden",
                showCommerceEnhancements ? "text-promo" : "text-ink-muted",
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  !showCommerceEnhancements && "text-ink",
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
                showCommerceEnhancements ? "text-promo" : "text-ink-muted",
                isDesktopCatalog && "block",
              )}
            >
              <span className="font-semibold">Transferencia:</span>{" "}
              {formatPrice(product.transferPrice)}
            </p>
          ) : null}
        </div>
        )}

        {showCommerceEnhancements && isCatalogVariant ? (
          <div className="mt-auto pt-3">
            <ProductCardBuyPill product={product} />
          </div>
        ) : null}

        {showCommerceEnhancements && !isCatalogVariant ? (
          <div className="mt-auto pt-2">
            <ProductCardActions
              product={product}
              addLabel="Agregar al carrito"
              viewLabel="Ver producto"
              outOfStockLabel="Sin stock"
              variant="default"
              className={cn(
                "w-full items-center overflow-hidden pt-2",
                product.hasSelectableOptions ? "justify-end" : "justify-between gap-1.5",
              )}
              buttonClassName="h-7 min-w-0 px-2.5 text-[10px] sm:px-2.5 sm:text-[10px]"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
