import type { ReactNode } from "react";
import type { Memory, ReactionEmoji } from "@/types/memory";

export type KeepsakeActionProps = {
  onOpen: () => void;
  onFavorite: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  onReaction: (emoji: ReactionEmoji) => void;
};

export type KeepsakeStatusProps = {
  isLocked: boolean;
  isCollaborative: boolean;
  isPinned: boolean;
  isFavorite: boolean;
};

export type KeepsakeMetadata = {
  title: string;
  preview: string;
  dateLabel: string;
  comments: number;
  favorites: number;
  reaction?: ReactionEmoji | null;
  reactions?: number;
  tags?: string[];
};

export type MemoryKeepsakeProps = KeepsakeActionProps & KeepsakeStatusProps & {
  memory: Memory;
  metadata: KeepsakeMetadata;
  previewUrl?: string;
  previewState: "idle" | "loading" | "ready" | "unavailable";
  reducedMotion: boolean | null;
};

export type KeepsakeLayoutProps = MemoryKeepsakeProps;
export type KeepsakeSlotProps = { children: ReactNode; className?: string };



