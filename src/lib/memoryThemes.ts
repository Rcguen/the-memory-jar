import { PaperStyleType, DecorationID } from "@/types/memory";
import { PaperStyleDefinition, DecorationDefinition } from "./themeDefinitions/types";
import { THEME_DEFINITIONS } from "./themeDefinitions";
import { createDeterministicRandom } from "./utils/random";

// Re-export for convenience
export * from "./themeDefinitions/types";
export { THEME_DEFINITIONS as MEMORY_THEMES };

export const PAPER_STYLES: Record<PaperStyleType, PaperStyleDefinition> = Object.freeze({
  letter: {
    id: "letter",
    label: "Letter",
    padding: "px-10 py-8",
    borderRadius: "rounded-xl",
    texture: "bg-transparent", // handled by theme
    overlay: "",
    shadow: "shadow-2xl",
    animationPreset: "modern",
  },
  folded_letter: {
    id: "folded_letter",
    label: "Folded Letter",
    padding: "px-10 py-8",
    borderRadius: "rounded-md",
    texture: "bg-transparent",
    overlay: "bg-gradient-to-b from-transparent via-black/[0.02] to-transparent bg-[length:100%_33.33%] bg-repeat-y dark:via-white/[0.02]",
    shadow: "shadow-2xl",
    animationPreset: "modern",
  },
  diary: {
    id: "diary",
    label: "Diary",
    padding: "px-12 py-10",
    borderRadius: "rounded-r-2xl rounded-l-md border-l-8 border-l-black/20 dark:border-l-black/40",
    texture: "bg-transparent",
    overlay: "",
    shadow: "shadow-xl",
    animationPreset: "modern",
  },
  postcard: {
    id: "postcard",
    label: "Postcard",
    padding: "px-8 py-6",
    borderRadius: "rounded-sm aspect-[3/2]",
    texture: "bg-transparent",
    overlay: "",
    shadow: "shadow-md",
    animationPreset: "modern",
  },
  notebook: {
    id: "notebook",
    label: "Notebook",
    padding: "px-12 py-8 pl-16",
    borderRadius: "rounded-lg",
    texture: "bg-transparent",
    overlay: "bg-[linear-gradient(transparent_95%,rgba(0,0,0,0.05)_100%)] bg-[length:100%_2rem] dark:bg-[linear-gradient(transparent_95%,rgba(255,255,255,0.05)_100%)]",
    shadow: "shadow-lg",
    animationPreset: "modern",
  },
  parchment: {
    id: "parchment",
    label: "Parchment",
    padding: "px-12 py-10",
    borderRadius: "rounded-none",
    texture: "bg-transparent",
    overlay: "shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]",
    shadow: "shadow-2xl",
    animationPreset: "vintage",
  }
});

export const DECORATIONS: DecorationDefinition[] = [
  { id: "rose" as DecorationID, label: "Rose", svg: "🌹", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "heart" as DecorationID, label: "Heart", svg: "❤️", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "stamp" as DecorationID, label: "Stamp", svg: "📮", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "wax_seal" as DecorationID, label: "Wax Seal", svg: "💮", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "flower" as DecorationID, label: "Flower", svg: "🌸", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "butterfly" as DecorationID, label: "Butterfly", svg: "🦋", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "sparkle" as DecorationID, label: "Sparkle", svg: "✨", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "ribbon" as DecorationID, label: "Ribbon", svg: "🎀", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "postmark" as DecorationID, label: "Postmark", svg: "⭕", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "polaroid_tape" as DecorationID, label: "Tape", svg: "🩹", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "leaf" as DecorationID, label: "Leaf", svg: "🌿", defaultSize: "text-4xl", defaultRotation: 0 },
  { id: "coffee_stain" as DecorationID, label: "Coffee", svg: "☕", defaultSize: "text-4xl", defaultRotation: 0 },
].map(d => Object.freeze(d)); // freeze each decoration

Object.freeze(DECORATIONS);

export function getDecorationPlacements(memoryId: string, decorations: string[]) {
  const rng = createDeterministicRandom(memoryId);
  
  // Available corner sectors for up to 4 decorations
  const sectors = [
    { top: true, left: true },
    { top: true, left: false },
    { top: false, left: true },
    { top: false, left: false },
  ];
  
  return decorations.map((id, index) => {
    const sectorIndex = index % 4;
    const sector = sectors[sectorIndex];
    
    // Deterministic offset 1% to 4% away from edges (keeps them near the corners)
    const xOffset = 1 + Math.floor(rng() * 3); 
    const yOffset = 1 + Math.floor(rng() * 3);
    
    // Deterministic rotation -30 to +30 degrees
    const rotation = -30 + Math.floor(rng() * 60);
    
    return {
      id,
      style: Object.freeze({
        position: 'absolute' as const,
        [sector.top ? 'top' : 'bottom']: `${yOffset}%`,
        [sector.left ? 'left' : 'right']: `${xOffset}%`,
        transform: `rotate(${rotation}deg)`,
      })
    };
  });
}
