"use client";

import { useCallback } from "react";

// Placeholder architecture for future sound implementation
export function useSound(soundPath: string) {
  const play = useCallback(() => {
    // TODO: Implement audio playback when needed
    // console.log(`Playing sound: ${soundPath}`);
  }, []);

  const stop = useCallback(() => {
    // TODO: Implement stop
  }, []);

  return { play, stop };
}
