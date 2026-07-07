"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductDetailImage } from "@/features/catalog/types";

const DESKTOP_PAGE = 5;

type ProductGalleryProps = {
  images: ProductDetailImage[];
  title: string;
};

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const galleryKey = images.map((image) => image.url ?? image.alt).join("|") || title;

  return <ProductGalleryContent key={galleryKey} images={images} title={title} />;
}

function ProductGalleryContent({ images, title }: ProductGalleryProps) {
  const gallery = images.length ? images : [{ url: null, alt: title }];
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const activeImage = gallery[activeIndex] ?? gallery[0];
  const hasMore = gallery.length > DESKTOP_PAGE;
  const canUp = thumbStart > 0;
  const canDown = thumbStart + DESKTOP_PAGE < gallery.length;
  const visibleThumbs = gallery.slice(thumbStart, thumbStart + DESKTOP_PAGE);

  const openLightbox = (index: number) => {
    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    previousActiveElementRef.current?.focus();
    previousActiveElementRef.current = null;
  }, []);

  const lightboxPrev = () => {
    setLightboxIndex((i) => Math.max(i - 1, 0));
  };

  const lightboxNext = () => {
    setLightboxIndex((i) => Math.min(i + 1, gallery.length - 1));
  };

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) => Math.min(i + 1, gallery.length - 1));
      }
      if (e.key === "Escape") closeLightbox();
    };

    window.addEventListener("keydown", onKey);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => window.removeEventListener("keydown", onKey);
  }, [closeLightbox, gallery.length, lightboxOpen]);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const lightboxImage = gallery[lightboxIndex];

  return (
    <>
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${title}`}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <button
            type="button"
            ref={closeButtonRef}
            onClick={closeLightbox}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs tracking-widest text-white">
            {lightboxIndex + 1} / {gallery.length}
          </div>

          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                lightboxPrev();
              }}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {lightboxIndex < gallery.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                lightboxNext();
              }}
              aria-label="Siguiente"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {lightboxImage?.url && (
            <div
              className="relative h-[90svh] w-[90vw] max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxImage.url}
                alt={lightboxImage.alt}
                fill
                sizes="90vw"
                className="object-contain"
                priority
              />
            </div>
          )}
        </div>
      )}

      <div className="flex w-full flex-col gap-2 overflow-hidden lg:hidden">
        <button
          type="button"
          onClick={() => openLightbox(activeIndex)}
          aria-label={`Abrir imagen principal de ${title}`}
          className="relative h-[44svh] w-full overflow-hidden rounded-xl border border-border/60 bg-[#efe5d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
        >
          {activeImage?.url ? (
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.24em] text-muted">
              Sin imagen
            </div>
          )}
          <div className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2.5 py-1 text-[0.65rem] tracking-[0.18em] text-white/90">
            {activeIndex + 1} / {gallery.length}
          </div>
        </button>

        {gallery.length > 1 && (
          <div className="flex w-full gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {gallery.map((image, index) => (
              <button
                key={`mob-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver imagen ${index + 1} de ${gallery.length}`}
                className={`relative aspect-square w-[27vw] shrink-0 overflow-hidden rounded-md border bg-[#efe5d8] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2 ${
                  index === activeIndex
                    ? "border-foreground/40 opacity-100"
                    : "border-border/60 opacity-55 hover:opacity-90"
                }`}
              >
                {image.url ? (
                  <Image src={image.url} alt={image.alt} fill sizes="27vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[0.6rem] uppercase tracking-widest text-muted">
                    Foto
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[5.2rem_minmax(0,1fr)] lg:gap-3">
        <div className="flex flex-col gap-0 self-start">
          {hasMore && (
            <button
              type="button"
              onClick={() => setThumbStart((s) => Math.max(s - 1, 0))}
              disabled={!canUp}
              aria-label="Fotos anteriores"
              className="flex h-7 w-full items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2 disabled:opacity-25"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}

          <div className="flex flex-col gap-2">
            {visibleThumbs.map((image, i) => {
              const globalIndex = thumbStart + i;

              return (
                <button
                  key={`desk-${globalIndex}`}
                  type="button"
                  onClick={() => setActiveIndex(globalIndex)}
                  aria-label={`Ver imagen ${globalIndex + 1} de ${gallery.length}`}
                  className={`relative aspect-[4/5] w-full overflow-hidden rounded-md border bg-[#efe5d8] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2 ${
                    globalIndex === activeIndex
                      ? "border-foreground/40 opacity-100"
                      : "border-border/60 opacity-55 hover:opacity-90 hover:border-foreground/20"
                  }`}
                >
                  {image.url ? (
                    <Image src={image.url} alt={image.alt} fill sizes="120px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[0.68rem] uppercase tracking-[0.18em] text-muted">
                      Foto
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setThumbStart((s) => Math.min(s + 1, gallery.length - DESKTOP_PAGE))}
              disabled={!canDown}
              aria-label="Mas fotos"
              className="flex h-7 w-full items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2 disabled:opacity-25"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => openLightbox(activeIndex)}
          aria-label={`Abrir imagen principal de ${title}`}
          className="relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-xl border border-border/60 bg-[#efe5d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
        >
          {activeImage?.url ? (
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              sizes="50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-[0.24em] text-muted">
              Sin imagen
            </div>
          )}
          <div className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2.5 py-1 text-[0.65rem] tracking-[0.18em] text-white/90">
            {activeIndex + 1} / {gallery.length}
          </div>
        </button>
      </div>
    </>
  );
}
