"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";

function subscribeToVisibility(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

function getVisibilitySnapshot() {
  return document.visibilityState === "visible";
}

function getServerVisibilitySnapshot() {
  return true;
}
export type HomeAmbientPauseReason =
  | "active"
  | "hidden"
  | "memory-modal"
  | "memory-viewer"
  | "reduced-motion";

export function useHomeAmbientMotion() {
  const reduceMotion = useReducedMotion();
  const isPhone = useIsPhone();
  const { isOpen: isMemoryModalOpen } = useMemoryModal();
  const { viewingMemoryId } = useMemoryViewer();
  const isDocumentVisible = useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    getServerVisibilitySnapshot,
  );

  const pauseReason = useMemo<HomeAmbientPauseReason>(() => {
    if (!isDocumentVisible) return "hidden";
    if (isMemoryModalOpen) return "memory-modal";
    if (viewingMemoryId) return "memory-viewer";
    if (reduceMotion) return "reduced-motion";
    return "active";
  }, [isDocumentVisible, isMemoryModalOpen, reduceMotion, viewingMemoryId]);

  const isActive = pauseReason === "active";

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.debug("[ambient-motion] lifecycle", {
      activeDecorativeAnimations: isActive ? (isPhone ? 2 : 6) : 0,
      paused: !isActive,
      reason: pauseReason,
      recurringTimers: isActive ? (isPhone ? 1 : 2) : 0,
    });
  }, [isActive, isPhone, pauseReason]);

  return {
    isActive,
    isPhone,
    pauseReason,
  };
}
