import { MemoryThemeType, DecorationID, PaperStyleType, AnimationPresetType } from "@/types/memory";

export interface PaperStyleDefinition {
  id: PaperStyleType;
  label: string;
  padding: string;
  borderRadius: string;
  texture: string;
  overlay: string;
  shadow: string;
  animationPreset: AnimationPresetType;
}

export interface DecorationDefinition {
  id: DecorationID;
  label: string;
  svg: string; // the emoji or svg string
  defaultSize: string;
  defaultRotation: number;
  allowedPaperStyles?: PaperStyleType[];
}

export interface MemoryThemeDefinition {
  id: MemoryThemeType;
  label: string;
  fontClass: string;
  backgroundClass: string;
  textClass: string;
  borderClass: string;
  previewThumbnail?: string;
  animationPreset: AnimationPresetType;
}
