"use client";

import { motion, Variants, useReducedMotion } from "framer-motion";
import { MemoryType } from "@/types/memory";
import {
  HeartHandshake,
  Mail,
  Image as ImageIcon,
  Mic,
  Video,
  Plane,
  Star,
  Heart,
  MessageCircleQuestion,
  X,
} from "lucide-react";
import { useIsPhone } from "@/hooks/useIsPhone";

interface MemoryTypeSelectorProps {
  onSelect: (type: MemoryType) => void;
  onCancel?: () => void;
}

const MEMORY_TYPES: { id: MemoryType; label: string; icon: React.ElementType; description: string }[] = [
  { id: "promise", label: "Promise", icon: HeartHandshake, description: "A vow to keep forever." },
  { id: "letter", label: "Letter", icon: Mail, description: "Words meant for the soul." },
  { id: "photo", label: "Photo", icon: ImageIcon, description: "A captured moment in time." },
  { id: "voice", label: "Voice", icon: Mic, description: "The warmth of spoken words." },
  { id: "video", label: "Video", icon: Video, description: "Living, breathing memories." },
  { id: "travel", label: "Travel", icon: Plane, description: "Adventures shared together." },
  { id: "wish", label: "Wish", icon: Star, description: "Hopes for the future." },
  { id: "gratitude", label: "Gratitude", icon: Heart, description: "Thankful for the little things." },
  { id: "random_thought", label: "Thought", icon: MessageCircleQuestion, description: "Just something on my mind." },
];

const getContainerVariants = (reduceMotion: boolean): Variants => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: reduceMotion ? 0 : 0.05, delayChildren: 0.1, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: reduceMotion ? 0 : 8,
    transition: { duration: 0.2, ease: "easeIn" },
  },
});

const getTitleVariants = (reduceMotion: boolean): Variants => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : -10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
});

const getSubtitleVariants = (reduceMotion: boolean): Variants => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : -4 },
  show: { opacity: 0.7, y: 0, transition: { duration: 0.4, delay: 0.05, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
});

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.22 } },
  exit: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
};

const getItemVariants = (reduceMotion: boolean): Variants => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
  exit: { opacity: 0, scale: reduceMotion ? 1 : 0.98, transition: { duration: 0.15 } },
});

export function MemoryTypeSelector({ onSelect, onCancel }: MemoryTypeSelectorProps) {
  const isPhone = useIsPhone();
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={getContainerVariants(shouldReduceMotion)}
      initial="hidden"
      animate="show"
      exit="exit"
      className="relative m-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-4 pb-8 pt-16 sm:pt-4"
    >
      {onCancel && (
        <motion.button
          type="button"
          onClick={onCancel}
          whileHover={{ scale: 1.08, rotate: 90 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="group absolute right-4 top-3 z-50 rounded-full p-3 transition-colors hover:bg-white/10 dark:hover:bg-white/5 sm:top-0 sm:p-2"
          aria-label="Close memory type selector"
        >
          <X className="w-6 h-6 text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors" />
        </motion.button>
      )}

      <motion.h2
        variants={getTitleVariants(shouldReduceMotion)}
        className="mb-3 text-center font-cormorant text-[2.35rem] leading-none text-zinc-900 dark:text-zinc-100 md:text-5xl"
      >
        What would you like to preserve?
      </motion.h2>

      <motion.p
        variants={getSubtitleVariants(shouldReduceMotion)}
        className="mb-8 max-w-md text-center font-inter text-sm text-zinc-600 dark:text-zinc-400 md:mb-12"
      >
        Select a memory type to begin.
      </motion.p>

      <motion.div variants={gridVariants} className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        {MEMORY_TYPES.map((type) => (
          <motion.button
            key={type.id}
            variants={getItemVariants(shouldReduceMotion)}
            onClick={() => onSelect(type.id)}
            whileHover={isPhone || shouldReduceMotion ? undefined : { y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex min-h-[120px] flex-col items-center justify-center overflow-hidden rounded-xl border border-[rgba(58,49,39,0.08)] bg-white/70 p-4 text-center transition-all hover:bg-white/95 hover:border-[rgba(58,49,39,0.15)] hover:shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 md:min-h-[140px] md:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)]"
            aria-label={`Select ${type.label}`}
          >
            <type.icon className="mb-3 h-7 w-7 text-stone-500 transition-colors duration-300 group-hover:text-rose-600 dark:text-stone-400 dark:group-hover:text-rose-400 md:mb-4 md:h-8 md:w-8" />
            <h3 className="mb-1 font-cormorant text-xl font-semibold text-zinc-900 dark:text-zinc-100 md:mb-2 md:text-2xl">
              {type.label}
            </h3>
            <p className="font-inter text-[11px] leading-tight text-zinc-500 opacity-100 transition-opacity duration-300 dark:text-zinc-400 md:text-xs">
              {type.description}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
