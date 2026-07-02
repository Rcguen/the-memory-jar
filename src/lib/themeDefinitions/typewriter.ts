import { MemoryThemeDefinition } from "./types";

export const typewriter = Object.freeze<MemoryThemeDefinition>({
  id: "typewriter",
  label: "Typewriter",
  backgroundClass: "bg-stone-100 dark:bg-stone-900",
  textClass: "text-stone-800 dark:text-stone-300",
  borderClass: "border border-stone-300 dark:border-stone-700",
  fontClass: "font-mono",
  animationPreset: "modern",
});
