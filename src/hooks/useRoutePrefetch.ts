"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

function getPrefetchSkipReason() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return "hidden";

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection?.saveData) return "save-data";
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return "constrained-network";

  return null;
}

export function useIntentRoutePrefetch() {
  const router = useRouter();
  const prefetchedRoutesRef = useRef(new Set<string>());
  const requestCountRef = useRef(0);

  return useCallback((route: string) => {
    const skipReason = getPrefetchSkipReason();
    if (skipReason) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[route-prefetch] skipped", { reason: skipReason });
      }
      return;
    }

    if (prefetchedRoutesRef.current.has(route)) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[route-prefetch] skipped", { reason: "already-prefetched" });
      }
      return;
    }

    prefetchedRoutesRef.current.add(route);
    requestCountRef.current += 1;
    if (process.env.NODE_ENV === "development") {
      console.debug("[route-prefetch] request", { count: requestCountRef.current });
    }
    router.prefetch(route);
  }, [router]);
}

export function useRoutePrefetch(routes: string[]) {
  const router = useRouter();
  const routeKey = routes.join("|");

  useEffect(() => {
    for (const route of routeKey.split("|").filter(Boolean)) {
      router.prefetch(route);
    }
  }, [router, routeKey]);
}
