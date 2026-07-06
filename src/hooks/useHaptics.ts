"use client";

export type HapticFeedbackStyle = "light" | "medium" | "success" | "warning";

const PATTERNS: Record<HapticFeedbackStyle, number | number[]> = {
  light: 8,
  medium: 14,
  success: [10, 26, 16],
  warning: [18, 40, 18],
};

export function useHaptics() {
  const trigger = (style: HapticFeedbackStyle = "light") => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate(PATTERNS[style]);
  };

  return { trigger };
}
