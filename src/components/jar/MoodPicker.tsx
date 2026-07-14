"use client";

import { motion } from "framer-motion";
import { MemoryMood } from "@/types/memory";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
      <label className="font-inter text-sm text-zinc-500 dark:text-zinc-400 font-medium px-2">
        How does this memory feel?
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
                "relative flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 motion-reduce:transition-none md:h-14 md:w-14",
                isSelected 
                  ? "border-stone-300 bg-stone-100 shadow-sm dark:border-stone-600 dark:bg-stone-800" 
                  : "border-stone-200/50 bg-stone-50/50 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800/50 dark:bg-stone-900/50 dark:hover:border-stone-700 dark:hover:bg-stone-800"
              )}
            >
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 shadow-sm dark:bg-stone-100">
                  <Check className="h-2.5 w-2.5 text-white dark:text-stone-900" strokeWidth={3} />
                </div>
              )}
              
              <span className={cn(
                "text-2xl transition-transform duration-200 motion-reduce:transition-none md:text-3xl", 
                isSelected ? "scale-110 drop-shadow-sm" : "opacity-70 grayscale-[30%]"
              )}>
                {mood.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
