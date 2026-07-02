import { MemoryThemeDefinition } from "./types";

export const dark = Object.freeze<MemoryThemeDefinition>({
  id: "dark",
  label: "Dark",
  backgroundClass: "bg-zinc-950",
  textClass: "text-zinc-300",
  borderClass: "border border-zinc-800",
  fontClass: "font-inter",
  animationPreset: "dark",
});
