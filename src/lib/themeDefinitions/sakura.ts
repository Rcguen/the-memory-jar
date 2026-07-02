import { MemoryThemeDefinition } from "./types";

export const sakura = Object.freeze<MemoryThemeDefinition>({
  id: "sakura",
  label: "Sakura",
  backgroundClass: "bg-pink-50/80 dark:bg-pink-950/80 backdrop-blur-sm",
  textClass: "text-pink-900 dark:text-pink-100",
  borderClass: "border-2 border-pink-200 dark:border-pink-800",
  fontClass: "font-cormorant",
  animationPreset: "romantic",
});
