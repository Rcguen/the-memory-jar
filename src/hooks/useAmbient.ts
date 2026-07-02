"use client";

import { useCallback } from "react";

// Placeholder architecture for future ambient sound (e.g. rain, fireplace, soft wind)
export function useAmbient(type: "night" | "fireplace" | "rain" | "none") {
  const startAmbient = useCallback(() => {
    if (type === "none") return;
    // TODO: Implement looping ambient sound logic
    // console.log(`Starting ambient sound: ${type}`);
  }, [type]);

  const stopAmbient = useCallback(() => {
    // TODO: Implement stop
  }, []);

  return { startAmbient, stopAmbient };
}
