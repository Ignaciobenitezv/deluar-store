"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductDetailImage } from "@/features/catalog/types";

type ProductGalleryProps = {
  images: ProductDetailImage[];
  title: string;
};

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const gallery = images.length
    ? images
    : [{ url: null, alt: title }];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] ?? gallery[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  return (
    <section className="grid gap-4 lg:grid-cols-[7.2rem_minmax(0,1fr)] lg:gap-5">
      <div className="order-2 grid grid-cols-4 gap-3 lg:order-1 lg:grid-cols-1">
        {gallery.slice(0, 5).map((image, index) => (
          <button
            key={`${image.alt}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`relative aspect-[4/5] overflow-hidden rounded-[1.1rem] border bg-[#efe5d8] transition-all ${
              index === activeIndex
                ? "border-foreground/30 ring-1 ring-foreground/15"
                : "border-border/80 hover:border-foreground/18"
            }`}
          >
            {image.url ? (
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="180px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[0.68rem] uppercase tracking-[0.18em] text-muted">
                Foto
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="order-1 space-y-4 lg:order-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border/80 bg-[#efe5d8] shadow-[0_26px_64px_rgba(58,40,26,0.08)]">
          {activeImage?.url ? (
          <Image
            src={activeImage.url}
            alt={activeImage.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-[0.24em] text-muted">
            Sin imagen
          </div>
        )}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-border/70 bg-white/68 px-4 py-3 text-xs uppercase tracking-[0.22em] text-muted">
          <span>Galeria</span>
          <span>
            {Math.min(activeIndex + 1, gallery.length)} / {gallery.length}
          </span>
        </div>
      </div>
    </section>
  );
}
