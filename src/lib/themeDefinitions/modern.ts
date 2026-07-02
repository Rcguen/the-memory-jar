import { MemoryThemeDefinition } from "./types";

export const modern = Object.freeze<MemoryThemeDefinition>({
  id: "modern",
  label: "Modern",
  backgroundClass: "bg-[#fdfbf7] dark:bg-[#1a1a1a]",
  textClass: "text-zinc-800 dark:text-zinc-100",
  borderClass: "border border-black/5 dark:border-white/5",
  fontClass: "font-inter",
  animationPreset: "modern",
});
