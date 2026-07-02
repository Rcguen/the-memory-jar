"use client";

import { useSound } from "./useSound";

// Predefined sound effects for UI interactions
export const SFX = {
  GLASS_TAP: "/sounds/effects/glass-tap.mp3",
  PAPER_RUSTLE: "/sounds/effects/paper-rustle.mp3",
  SOFT_POP: "/sounds/effects/soft-pop.mp3",
  SPARKLE: "/sounds/effects/sparkle.mp3",
} as const;

export function useSfx(effectType: keyof typeof SFX) {
  const { play, stop } = useSound(SFX[effectType]);

  return { playSfx: play, stopSfx: stop };
}
