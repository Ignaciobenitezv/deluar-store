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
  objectPosition?: string;
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
  /** Catalog cards: link cursor, glass prev/next arrows and, on desktop,
   * photos that cycle while the mouse is over the image (crossfading) and
   * return to the main one on leave. */
  catalogGallery?: boolean;
};

const AUTOPLAY_INTERVAL_MS = 1500;
const CROSSFADE_MS = 300;

type ProductCardImageStackInnerProps = {
  images: ProductCardImage[];
  sizes: string;
  className?: string;
  imageClassName?: string;
  placeholder?: ReactNode;
  placeholderClassName?: string;
  canHover: boolean;
  href?: string;
  catalogGallery: boolean;
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
          image.url ? [{ url: image.url, alt: image.alt, objectPosition: image.objectPosition }] : [],
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
  catalogGallery,
}: ProductCardImageStackInnerProps) {
  const hasMultipleImages = images.length > 1;
  // `previous` is the outgoing photo: it fades out on top of the incoming one.
  const [{ active: activeIndex, previous: previousIndex }, setSlide] = useState({
    active: 0,
    previous: 0,
  });
  // Photos are mounted (and so downloaded) only once they are about to show.
  const [mountedIndices, setMountedIndices] = useState<ReadonlySet<number>>(() => new Set([0]));
  const loadedIndicesRef = useRef(new Set<number>());
  const [isHoverPlaying, setIsHoverPlaying] = useState(false);
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

  const goToImage = (getIndex: (current: number) => number) => {
    setSlide((current) => {
      const next = images.length <= 1 ? 0 : getIndex(current.active);
      return next === current.active ? current : { active: next, previous: current.active };
    });
  };

  const goToPreviousImage = () => {
    goToImage((current) => (current - 1 + images.length) % images.length);
  };

  const goToNextImage = () => {
    goToImage((current) => (current + 1) % images.length);
  };

  // Bumped by every manual navigation (arrows, dots, swipe) to restart the
  // autoplay countdown, so the chosen photo stays a full interval.
  const [manualNavCount, setManualNavCount] = useState(0);

  const navigateManually = (go: () => void) => {
    go();
    setManualNavCount((count) => count + 1);
  };

  const canAutoplay = catalogGallery && canHover && hasMultipleImages;

  // One interval per hover, torn down on leave, so quick in/out never stacks
  // timers. While playing, the next photo is mounted one step ahead so it has
  // time to load; a tick whose photo is not loaded yet waits for the next one.
  // The previous one too, so the left arrow does not wait on a download.
  const preloadIndices = isHoverPlaying
    ? [(activeIndex + 1) % images.length, (activeIndex - 1 + images.length) % images.length]
    : [];

  useEffect(() => {
    if (!isHoverPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSlide((current) => {
        const next = (current.active + 1) % images.length;
        return loadedIndicesRef.current.has(next) ? { active: next, previous: current.active } : current;
      });
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isHoverPlaying, images.length, manualNavCount]);

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !canAutoplay ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    setIsHoverPlaying(true);
  };

  const handlePointerLeave = () => {
    if (!isHoverPlaying) {
      return;
    }

    setIsHoverPlaying(false);
    goToImage(() => 0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    // Capturing a press on a dot or arrow would retarget its click to this
    // container and open the product page.
    if ((event.target as HTMLElement).closest("[data-gallery-control='true']")) {
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

      navigateManually(deltaX < 0 ? goToNextImage : goToPreviousImage);
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
        catalogGallery
          ? "cursor-pointer"
          : cn(canHover ? "cursor-grab active:cursor-grabbing" : "touch-pan-y", isPointerActive && "cursor-grabbing"),
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
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
        if (!href || (event.target as HTMLElement).closest("[data-gallery-control='true']")) {
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
      {activeImage && catalogGallery ? (
        images.map((image, index) => {
          const isActive = index === safeActiveIndex;
          // Outgoing photo, fading out above the incoming one.
          const isLeaving = index === previousIndex && !isActive;

          // Loaded photos stay mounted; manual navigation can jump to one
          // that is not mounted yet.
          if (!isActive && !preloadIndices.includes(index) && !mountedIndices.has(index)) {
            return null;
          }

          return (
            <Image
              key={`${image.url}-${index}`}
              src={image.url}
              alt={isActive ? image.alt : ""}
              aria-hidden={isActive ? undefined : true}
              fill
              sizes={sizes}
              className={cn(
                "h-full w-full rounded-none object-cover object-center transition-opacity ease-out motion-reduce:transition-none",
                imageClassName,
              )}
              style={{
                objectPosition: image.objectPosition ?? "50% 50%",
                transformOrigin: "center center",
                opacity: isActive ? 1 : 0,
                zIndex: isLeaving ? 2 : isActive ? 1 : 0,
                transitionDuration: isLeaving ? `${CROSSFADE_MS}ms` : "0ms",
              }}
              onLoad={() => {
                loadedIndicesRef.current.add(index);
                setMountedIndices((current) => (current.has(index) ? current : new Set(current).add(index)));
              }}
              draggable={false}
            />
          );
        })
      ) : activeImage ? (
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
            objectPosition: activeImage.objectPosition ?? "50% 50%",
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

      {/* Before the dots so Tab goes photo, previous, next, dots. */}
      {catalogGallery && canHover && hasMultipleImages ? (
        <>
          <GalleryArrow direction="previous" onClick={() => navigateManually(goToPreviousImage)} />
          <GalleryArrow direction="next" onClick={() => navigateManually(goToNextImage)} />
        </>
      ) : null}

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
                    navigateManually(() => goToImage(() => index));
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
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

// Frosted glass arrows: shown while the photo is hovered or while keyboard
// focus is anywhere in it; only rendered on devices with a real hover.
function GalleryArrow({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-gallery-control="true"
      aria-label={direction === "previous" ? "Imagen anterior" : "Imagen siguiente"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/45 text-ink opacity-0 shadow-[0_2px_10px_color-mix(in_srgb,var(--ink)_12%,transparent)] backdrop-blur-md transition-opacity duration-200 hover:bg-white/65 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring group-hover/image:opacity-100 group-has-[:focus-visible]/image:opacity-100",
        direction === "previous" ? "left-2.5" : "right-2.5",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direction === "previous" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
      </svg>
    </button>
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
  catalogGallery = false,
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
      catalogGallery={catalogGallery}
    />
  );
}
