"use client";

import { useCallback, useRef, useState } from "react";

interface PullToRefreshOptions {
  disabled?: boolean;
  maxPull?: number;
  threshold?: number;
  onRefresh: () => Promise<void> | void;
}

export function usePullToRefresh({
  disabled = false,
  maxPull = 88,
  threshold = 72,
  onRefresh,
}: PullToRefreshOptions) {
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reset = useCallback(() => {
    startYRef.current = null;
    activeRef.current = false;
    setPullDistance(0);
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (disabled || isRefreshing || window.scrollY > 0) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
    activeRef.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!activeRef.current || startYRef.current === null || disabled || isRefreshing) return;
    if (window.scrollY > 0) {
      reset();
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    const eased = Math.min(maxPull, delta * 0.45);
    setPullDistance(eased);
  }, [disabled, isRefreshing, maxPull, reset]);

  const handleTouchEnd = useCallback(async () => {
    if (!activeRef.current || disabled || isRefreshing) {
      reset();
      return;
    }

    const shouldRefresh = pullDistance >= threshold;
    reset();

    if (!shouldRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance, reset, threshold]);

  return {
    isRefreshing,
    pullDistance,
    bind: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: reset,
    },
  };
}
