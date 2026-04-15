"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { HomeNewInProduct } from "@/features/home/types";

type HomeNewInStripProps = {
  products: HomeNewInProduct[];
  activeProductId?: string;
  onSelectProduct?: (productId: string) => void;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeNewInStrip({
  products,
  activeProductId,
  onSelectProduct,
}: HomeNewInStripProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (products.length === 0) {
    return null;
  }

  const scrollRail = (direction: "left" | "right") => {
    if (!railRef.current) return;

    railRef.current.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="space-y-4 lg:sticky lg:top-24">
        <div className="space-y-1.5">
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted/78">
            Seleccion
          </p>
          <h2 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground">
            Lo nuevo en Deluar
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/productos"
            className="text-[0.64rem] uppercase tracking-[0.16em] text-foreground/78 transition-colors hover:text-foreground"
          >
            Ver todos
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Productos anteriores"
              onClick={() => scrollRail("left")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d2ca] bg-white text-foreground/72 transition-colors duration-200 hover:border-[#c6bbae] hover:bg-[#f7f5f1] hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.5 3.5 5 8l4.5 4.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Productos siguientes"
              onClick={() => scrollRail("right")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d2ca] bg-white text-foreground/72 transition-colors duration-200 hover:border-[#c6bbae] hover:bg-[#f7f5f1] hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6.5 3.5 11 8l-4.5 4.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max gap-5">
          {products.map((product) => (
            <article
              key={product.id}
              className={`w-[26rem] shrink-0 overflow-hidden rounded-[0.45rem] border bg-[#f6efe6] transition-colors duration-200 ${
                product.id === activeProductId
                  ? "border-[#d7bea4]"
                  : "border-[#ece3d8] hover:border-[#ddd1c3]"
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                aria-pressed={product.id === activeProductId}
                onClick={() => onSelectProduct?.(product.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectProduct?.(product.id);
                  }
                }}
                className="group flex h-[9.75rem] cursor-pointer"
              >
                <div className="relative h-[9.75rem] w-[9.25rem] shrink-0 bg-[#efe6da]">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      fill
                      sizes="136px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,#f5efe7_0%,#e8ddd1_100%)]" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1 px-4 py-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted/72">
                    {product.categoryTitle}
                  </p>
                  <h3 className="line-clamp-2 text-[0.95rem] font-medium leading-[1.25] text-foreground">
                    {product.title}
                  </h3>
                  <p className="pt-0.5 text-[1.1rem] font-semibold leading-none text-foreground">
                    {formatPrice(product.basePrice)}
                  </p>
                  {product.transferPrice ? (
                    <p className="mt-1 text-[0.85rem] leading-[1.2] text-[#c47a2c]">
                      <span className="font-medium opacity-80">Transferencia:</span>{" "}
                      <span className="font-semibold">{formatPrice(product.transferPrice)}</span>
                    </p>
                  ) : null}
                  <Link
                    href={product.productHref}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex pt-1 text-[0.62rem] uppercase tracking-[0.16em] text-foreground/70 transition-colors hover:text-foreground"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
