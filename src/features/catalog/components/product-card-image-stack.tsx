import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProductCardImageStackProps = {
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl?: string | null;
  sizes: string;
  className?: string;
  imageClassName?: string;
  placeholder?: ReactNode;
  placeholderClassName?: string;
};

export function ProductCardImageStack({
  imageUrl,
  imageAlt,
  hoverImageUrl,
  sizes,
  className,
  imageClassName,
  placeholder,
  placeholderClassName,
}: ProductCardImageStackProps) {
  const hasHoverImage = Boolean(hoverImageUrl);
  const hoverSrc = hoverImageUrl ?? "";

  return (
    <div className={cn("group relative h-full w-full overflow-hidden", className)}>
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes={sizes}
            className={cn(
              "h-full w-full rounded-none transition-opacity duration-300",
              hasHoverImage &&
                "lg:transition-[opacity,transform] lg:duration-300 lg:group-hover:opacity-0 lg:group-hover:scale-[1.03]",
              imageClassName,
            )}
          />
          {hasHoverImage ? (
            <Image
              src={hoverSrc}
              alt=""
              aria-hidden="true"
              fill
              sizes={sizes}
              className={cn(
                "pointer-events-none h-full w-full rounded-none opacity-0 transition-opacity duration-300 lg:group-hover:opacity-100",
                imageClassName,
              )}
            />
          ) : null}
        </>
      ) : (
        placeholder ?? (
          <div
            className={cn(
              "flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-[0.24em] text-muted",
              placeholderClassName,
            )}
          >
            Sin imagen
          </div>
        )
      )}
    </div>
  );
}
