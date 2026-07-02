"use client";

import { motion } from "framer-motion";
import { MemoryMood } from "@/types/memory";
import { cn } from "@/lib/utils";

interface MoodPickerProps {
  selectedMoodId: string | null;
  onSelect: (moodId: string) => void;
}

// Since these are seeded in the DB, we define them here for instant UI rendering without a fetch
export const PREDEFINED_MOODS: MemoryMood[] = [
  { id: "love", emoji: "❤️", name: "Love", color: "text-rose-500" },
  { id: "emotional", emoji: "🥹", name: "Emotional", color: "text-blue-500" },
  { id: "joy", emoji: "😂", name: "Joy", color: "text-amber-500" },
  { id: "peace", emoji: "🌸", name: "Peace", color: "text-pink-400" },
  { id: "magic", emoji: "✨", name: "Magic", color: "text-yellow-400" },
  { id: "night", emoji: "🌙", name: "Night", color: "text-indigo-400" },
  { id: "day", emoji: "☀️", name: "Day", color: "text-orange-400" },
];

export function MoodPicker({ selectedMoodId, onSelect }: MoodPickerProps) {
  return (
    <div className="w-full flex flex-col gap-3">
      <label className="font-inter text-sm text-zinc-500 dark:text-zinc-400 font-medium px-2">
        How does this memory feel?
      </label>
      <div className="flex flex-wrap gap-2 md:gap-3 p-1">
        {PREDEFINED_MOODS.map((mood) => {
          const isSelected = selectedMoodId === mood.id;
          
          return (
            <motion.button
              key={mood.id}
              type="button"
              onClick={() => onSelect(mood.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all duration-300 outline-none",
                isSelected 
                  ? "bg-white dark:bg-zinc-800 shadow-md border-2 border-transparent" 
                  : "bg-white/40 dark:bg-zinc-800/40 hover:bg-white/80 dark:hover:bg-zinc-700/80 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 opacity-60 hover:opacity-100"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="mood-ring"
                  className={cn("absolute inset-0 rounded-full border-2 opacity-50", mood.color.replace("text-", "border-"))}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              
              {/* Soft glow for selected */}
              {isSelected && (
                <div className={cn("absolute inset-0 rounded-full blur-md opacity-20", mood.color.replace("text-", "bg-"))} />
              )}
              
              <span className={cn("text-2xl md:text-3xl z-10 drop-shadow-sm", isSelected ? "" : "grayscale-[30%]")}>
                {mood.emoji}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
