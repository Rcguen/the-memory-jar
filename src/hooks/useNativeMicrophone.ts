"use client";

import { useMemo } from "react";

export function useNativeMicrophone() {
  const canUseMicrophone = useMemo(() => (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  ), []);

  const requestMicrophone = async () => {
    if (!canUseMicrophone) return null;
    return navigator.mediaDevices.getUserMedia({ audio: true });
  };

  return {
    canUseMicrophone,
    requestMicrophone,
  };
}
