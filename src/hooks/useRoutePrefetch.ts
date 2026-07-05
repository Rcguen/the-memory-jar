"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRoutePrefetch(routes: string[]) {
  const router = useRouter();
  const routeKey = routes.join("|");

  useEffect(() => {
    for (const route of routeKey.split("|").filter(Boolean)) {
      router.prefetch(route);
    }
  }, [router, routeKey]);
}
