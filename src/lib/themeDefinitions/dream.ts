import { MemoryThemeDefinition } from "./types";

export const dream = Object.freeze<MemoryThemeDefinition>({
  id: "dream",
  label: "Dream",
  backgroundClass: "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950",
  textClass: "text-indigo-900 dark:text-indigo-100",
  borderClass: "border border-white/40 dark:border-black/40",
  fontClass: "font-inter",
  animationPreset: "dream",
});
