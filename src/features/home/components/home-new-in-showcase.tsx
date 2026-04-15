"use client";

import { useEffect, useMemo, useState } from "react";
import { HomeNewInFeaturedPdp } from "@/features/home/components/home-new-in-featured-pdp";
import { HomeNewInStrip } from "@/features/home/components/home-new-in-strip";
import type { HomeNewInProduct } from "@/features/home/types";

type HomeNewInShowcaseProps = {
  products: HomeNewInProduct[];
};

export function HomeNewInShowcase({ products }: HomeNewInShowcaseProps) {
  const [activeProductId, setActiveProductId] = useState<string | null>(products[0]?.id ?? null);

  useEffect(() => {
    if (!products.some((product) => product.id === activeProductId)) {
      setActiveProductId(products[0]?.id ?? null);
    }
  }, [activeProductId, products]);

  useEffect(() => {
    if (products.length <= 1 || !activeProductId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const currentIndex = products.findIndex((product) => product.id === activeProductId);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = safeCurrentIndex + 1 >= products.length ? 0 : safeCurrentIndex + 1;

      setActiveProductId(products[nextIndex].id);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [activeProductId, products]);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) ?? products[0] ?? null,
    [activeProductId, products],
  );

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <HomeNewInStrip
        products={products}
        activeProductId={activeProduct?.id}
        onSelectProduct={setActiveProductId}
      />
      <HomeNewInFeaturedPdp product={activeProduct} />
    </div>
  );
}
