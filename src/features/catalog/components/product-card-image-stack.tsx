"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { ProductDetailImage } from "@/features/catalog/types";

type ProductCardImage = {
  url: string;
  alt: string;
};

type ProductCardImageStackProps = {
  images?: ProductDetailImage[];
  imageUrl?: string | null;
  imageAlt: string;
  hoverImageUrl?: string | null;
  sizes: string;
  className?: string;
  imageClassName?: string;
  placeholder?: ReactNode;
  placeholderClassName?: string;
  href?: string;
};

type ProductCardImageStackInnerProps = {
  images: ProductCardImage[];
  sizes: string;
  className?: string;
  imageClassName?: string;
  placeholder?: ReactNode;
  placeholderClassName?: string;
  canHover: boolean;
  href?: string;
};

function normalizeImages(
  images: ProductDetailImage[] | undefined,
  imageUrl: string | null | undefined,
  imageAlt: string,
  hoverImageUrl: string | null | undefined,
): ProductCardImage[] {
  const nextImages: ProductCardImage[] =
    images && images.length > 0
      ? images.flatMap((image) =>
          image.url ? [{ url: image.url, alt: image.alt }] : [],
        )
      : [
          imageUrl ? { url: imageUrl, alt: imageAlt } : null,
          hoverImageUrl ? { url: hoverImageUrl, alt: imageAlt } : null,
        ].filter((image): image is ProductCardImage => Boolean(image?.url));

  const seen = new Set<string>();

  return nextImages.filter((image) => {
    const key = `${image.url}|${image.alt}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function useCanHover() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const update = () => {
      setCanHover(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);

      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);

    return () => mediaQuery.removeListener(update);
  }, []);

  return canHover;
}

function ProductCardImageStackInner({
  images,
  sizes,
  className,
  imageClassName,
  placeholder,
  placeholderClassName,
  canHover,
  href,
}: ProductCardImageStackInnerProps) {
  const hasMultipleImages = images.length > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const swipeStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    isHorizontal: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const router = useRouter();
  const safeActiveIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const activeImage = images[safeActiveIndex];

  const goToPreviousImage = () => {
    setActiveIndex((current) => {
      if (images.length <= 1) {
        return 0;
      }

      return (current - 1 + images.length) % images.length;
    });
  };

  const goToNextImage = () => {
    setActiveIndex((current) => {
      if (images.length <= 1) {
        return 0;
      }

      return (current + 1) % images.length;
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    swipeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isHorizontal: false,
    };
    setIsPointerActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = swipeStateRef.current;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (!state.isHorizontal) {
      if (horizontalDistance < 8 && verticalDistance < 8) {
        return;
      }

      if (horizontalDistance <= verticalDistance) {
        swipeStateRef.current = null;
        setIsPointerActive(false);
        return;
      }

      state.isHorizontal = true;
    }
  };

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const state = swipeStateRef.current;
    const target = event.currentTarget;

    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);
    const shouldSwipe = state.isHorizontal && horizontalDistance >= 44 && horizontalDistance > verticalDistance;

    if (shouldSwipe) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      if (deltaX < 0) {
        goToNextImage();
      } else {
        goToPreviousImage();
      }
    }

    swipeStateRef.current = null;
    setIsPointerActive(false);
  };

  const handleActivate = () => {
    if (!href || suppressClickRef.current) {
      return;
    }

    router.push(href);
  };

  return (
    <div
      className={cn(
        "group/image relative h-full w-full overflow-hidden touch-pan-y",
        canHover ? "cursor-grab active:cursor-grabbing" : "touch-pan-y",
        isPointerActive && "cursor-grabbing",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement | null;

        if (target?.closest("[data-gallery-control='true']")) {
          return;
        }

        handleActivate();
      }}
      onKeyDown={(event) => {
        if (!href) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
    >
      {activeImage ? (
        <Image
          src={activeImage.url}
          alt={activeImage.alt}
          fill
          sizes={sizes}
          className={cn(
            "h-full w-full rounded-none object-cover object-center",
            imageClassName,
          )}
          style={{
            objectPosition: "50% 50%",
            transformOrigin: "center center",
          }}
          draggable={false}
        />
      ) : placeholder ? (
        <>{placeholder}</>
      ) : (
        <div
          className={cn(
            "flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-[0.24em] text-muted",
            placeholderClassName,
          )}
        >
          Sin imagen
        </div>
      )}

      {hasMultipleImages ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
          <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/18 px-2 py-1 shadow-[0_3px_12px_rgba(0,0,0,0.12)] backdrop-blur-md backdrop-saturate-150">
            {images.map((image, index) => {
              const isActive = index === safeActiveIndex;

              return (
                <button
                  key={`${image.url}-${image.alt}-${index}`}
                  type="button"
                  data-gallery-control="true"
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#243247] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    isActive ? "w-4 bg-white opacity-95" : "w-1.5 bg-white/60 hover:bg-white/80",
                  )}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProductCardImageStack({
  images,
  imageUrl,
  imageAlt,
  hoverImageUrl,
  sizes,
  className,
  imageClassName,
  placeholder,
  placeholderClassName,
  href,
}: ProductCardImageStackProps) {
  const resolvedImages = useMemo(
    () => normalizeImages(images, imageUrl, imageAlt, hoverImageUrl),
    [images, imageAlt, hoverImageUrl, imageUrl],
  );
  const resolvedKey = useMemo(
    () => resolvedImages.map((image) => `${image.url}|${image.alt}`).join("|"),
    [resolvedImages],
  );
  const canHover = useCanHover();

  return (
    <ProductCardImageStackInner
      key={resolvedKey}
      images={resolvedImages}
      sizes={sizes}
      className={className}
      imageClassName={imageClassName}
      placeholder={placeholder}
      placeholderClassName={placeholderClassName}
      canHover={canHover}
      href={href}
    />
  );
}
