"use client";

import { MemoryMood } from "@/types/memory";
import { cn } from "@/lib/utils";
import { Check, Droplets, Flower2, Heart, Laugh, Moon, Sparkles, Sun } from "lucide-react";

const MOOD_ICONS = {
  love: Heart,
  emotional: Droplets,
  joy: Laugh,
  peace: Flower2,
  magic: Sparkles,
  night: Moon,
  day: Sun,
} as const;

interface MoodPickerProps {
  selectedMoodId: string | null;
  onSelect: (moodId: string) => void;
}

// Since these are seeded in the DB, we define them here for instant UI rendering without a fetch
export const PREDEFINED_MOODS: MemoryMood[] = [
  { id: "love", emoji: "❤️", name: "Love", color: "text-rose-600 dark:text-rose-400" },
  { id: "emotional", emoji: "🥹", name: "Emotional", color: "text-blue-600 dark:text-blue-400" },
  { id: "joy", emoji: "😂", name: "Joy", color: "text-amber-600 dark:text-amber-400" },
  { id: "peace", emoji: "🌸", name: "Peace", color: "text-pink-600 dark:text-pink-400" },
  { id: "magic", emoji: "✨", name: "Magic", color: "text-yellow-600 dark:text-yellow-400" },
  { id: "night", emoji: "🌙", name: "Night", color: "text-indigo-600 dark:text-indigo-400" },
  { id: "day", emoji: "☀️", name: "Day", color: "text-orange-600 dark:text-orange-400" },
];

export function MoodPicker({ selectedMoodId, onSelect }: MoodPickerProps) {
  return (
    <div className="w-full flex flex-col gap-3">
      <label className="font-inter text-xs text-[var(--text-secondary)] font-medium">
        Mood
      </label>
      <div
        className="flex flex-wrap gap-2 md:gap-3"
        role="group"
        aria-label="Mood selection"
      >
        {PREDEFINED_MOODS.map((mood) => {
          const isSelected = selectedMoodId === mood.id;
          
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onSelect(mood.id)}
              aria-pressed={isSelected}
              aria-label={mood.name}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)] focus-visible:ring-offset-2 motion-reduce:transition-none md:h-12 md:w-12",
                isSelected 
                  ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]" 
                  : "border-[var(--divider)] bg-[var(--surface-base)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-raised)]"
              )}
            >
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-primary)]">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
              )}
              
              {(() => {
                const Icon = MOOD_ICONS[mood.id as keyof typeof MOOD_ICONS] ?? Heart;
                return <Icon className={cn("h-5 w-5 transition-transform duration-200 motion-reduce:transition-none", isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]")} strokeWidth={1.7} aria-hidden="true" />;
              })()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
