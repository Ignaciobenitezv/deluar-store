"use client";

import { useEffect, useRef } from "react";
import { trackProductView } from "@/features/analytics/client/track-event";

type ProductViewTrackerProps = {
  productId: string;
  productSlug: string;
  variantId?: string | null;
};

export function ProductViewTracker({
  productId,
  productSlug,
  variantId,
}: ProductViewTrackerProps) {
  const trackedProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedProductIdRef.current === productId) {
      return;
    }

    trackedProductIdRef.current = productId;

    trackProductView({
      productId,
      productSlug,
      variantId,
    });
  }, [productId, productSlug, variantId]);

  return null;
}
