"use client";

import { useMemo } from "react";

export function useNativeCamera() {
  const canUseCamera = useMemo(() => (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  ), []);

  const openCameraCapture = (input: HTMLInputElement | null) => {
    if (!input) return false;
    input.click();
    return true;
  };

  return {
    canUseCamera,
    openCameraCapture,
  };
}
