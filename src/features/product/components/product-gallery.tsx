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
    <section className="grid gap-3 lg:grid-cols-[5.2rem_minmax(0,1fr)] lg:gap-3">
      <div className="order-2 grid grid-cols-4 gap-1.5 lg:order-1 lg:grid-cols-1 lg:gap-2">
        {gallery.slice(0, 5).map((image, index) => (
          <button
            key={`${image.alt}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`relative aspect-[4/5] overflow-hidden rounded-md border bg-[#efe5d8] transition-all ${
              index === activeIndex
                ? "border-foreground/40 opacity-100"
                : "border-border/60 opacity-60 hover:opacity-90 hover:border-foreground/20"
            }`}
          >
            {image.url ? (
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="120px"
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

      <div className="order-1 lg:order-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/60 bg-[#efe5d8]">
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
          <div className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2.5 py-1 text-[0.65rem] tracking-[0.18em] text-white/90">
            {Math.min(activeIndex + 1, gallery.length)} / {gallery.length}
          </div>
        </div>
      </div>
    </section>
  );
}
