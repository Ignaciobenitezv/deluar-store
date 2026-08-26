"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/features/analytics/client/track-event";

export function StorefrontAnalyticsBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedKeyRef = useRef<string | null>(null);
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const url = searchKey.length > 0 ? `${pathname}?${searchKey}` : pathname;

    if (lastTrackedKeyRef.current === url) {
      return;
    }

    lastTrackedKeyRef.current = url;
    trackPageView();
  }, [pathname, searchKey]);

  return null;
}
