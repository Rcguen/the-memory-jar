import { Memory, ReactionEmoji } from "./memory";

export interface YearRecapStats {
  year: number;
  daysTogether: number;
  totalMemories: number;
  totalPhotos: number;
  totalVideos: number;
  totalVoices: number;
  totalLetters: number;
  openedCapsules: number;
  totalFavorites: number;
  totalPinned: number;
  mostActiveMonth: string | null; // e.g., "07" for July
  longestStreak: number;
  firstMemory: Memory | null;
  lastMemory: Memory | null;
  mostCommonMood: { name: string; emoji: string } | null;
  favoriteReaction: ReactionEmoji | null;
}

export type StoryChapterType =
  | "the_beginning"
  | "first_anniversary"
  | "spring"
  | "summer"
  | "autumn"
  | "winter"
  | "holidays"
  | "time_capsules"
  | "favorites"
  | "recent";

export interface StoryChapter {
  id: string;
  type: StoryChapterType;
  title: string;
  subtitle?: string;
  memories: Memory[];
  coverImageUrl?: string;
}

export interface MemoryHighlights {
  mostLoved: Memory[];
  mostCommented: Memory[];
  mostReacted: Memory[];
  newest: Memory[];
  oldest: Memory[];
  hiddenGems: Memory[]; // Old memories with high interaction or specific types
  waitingCapsules: Memory[];
}

export type BookPageLayout = "full_photo" | "photo_with_caption" | "letter" | "voice" | "video" | "capsule" | "text_only";

export interface BookPageData {
  id: string;
  memory: Memory;
  layout: BookPageLayout;
  pageNumber: number;
  chapterTitle?: string;
}
