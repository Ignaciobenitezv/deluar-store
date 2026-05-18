"use client";

import { useEffect, useMemo, useState } from "react";
import { HomeNewInFeaturedPdp } from "@/features/home/components/home-new-in-featured-pdp";
import { HomeNewInStrip } from "@/features/home/components/home-new-in-strip";
import type { HomeNewInProduct } from "@/features/home/types";

type HomeNewInShowcaseProps = {
  products: HomeNewInProduct[];
};

export function HomeNewInShowcase({ products }: HomeNewInShowcaseProps) {
  const [requestedActiveProductId, setRequestedActiveProductId] = useState<string | null>(null);

  const activeProduct = useMemo(
    () =>
      products.find((product) => product.id === requestedActiveProductId) ??
      products[0] ??
      null,
    [requestedActiveProductId, products],
  );

  useEffect(() => {
    if (products.length <= 1 || !activeProduct) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const currentIndex = products.findIndex((product) => product.id === activeProduct.id);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = safeCurrentIndex + 1 >= products.length ? 0 : safeCurrentIndex + 1;

      setRequestedActiveProductId(products[nextIndex].id);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [activeProduct, products]);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <HomeNewInStrip
        products={products}
        activeProductId={activeProduct?.id}
        onSelectProduct={setRequestedActiveProductId}
      />
      <HomeNewInFeaturedPdp product={activeProduct} />
    </div>
  );
}
