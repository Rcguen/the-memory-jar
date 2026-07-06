"use client";

import { motion, Variants } from "framer-motion";
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

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { staggerChildren: 0.08, delayChildren: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.985,
    filter: "blur(8px)",
    transition: { duration: 0.34, staggerChildren: 0.035, staggerDirection: -1, ease: [0.55, 0, 0.1, 1] },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: -18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -14, transition: { duration: 0.2, ease: [0.55, 0, 0.1, 1] } },
};

const subtitleVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 0.7, y: 0, transition: { duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.55, 0, 0.1, 1] } },
};

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.22 } },
  exit: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 22 } },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.22, ease: [0.55, 0, 0.1, 1] } },
};

export function MemoryTypeSelector({ onSelect, onCancel }: MemoryTypeSelectorProps) {
  const isPhone = useIsPhone();

  return (
    <motion.div
      variants={containerVariants}
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
        variants={titleVariants}
        className="mb-3 text-center font-cormorant text-[2.35rem] leading-none text-zinc-800 dark:text-zinc-200 md:text-5xl"
      >
        What would you like to preserve?
      </motion.h2>

      <motion.p
        variants={subtitleVariants}
        className="mb-8 max-w-md text-center font-inter text-sm text-zinc-500 dark:text-zinc-400 md:mb-12"
      >
        Select a memory type to begin.
      </motion.p>

      <motion.div variants={gridVariants} className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        {MEMORY_TYPES.map((type) => (
          <motion.button
            key={type.id}
            variants={itemVariants}
            onClick={() => onSelect(type.id)}
            whileHover={isPhone ? undefined : { scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/50 bg-white/55 p-4 text-center transition-colors backdrop-blur-md hover:bg-white/60 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60 md:min-h-[150px] md:p-8"
          >
            <div className="absolute inset-0 -translate-x-[150%] skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-sweep pointer-events-none" />

            <type.icon className="mb-3 h-7 w-7 text-rose-500/70 transition-transform duration-500 group-hover:scale-110 dark:text-rose-400/70 md:mb-4 md:h-10 md:w-10" />
            <h3 className="mb-1 font-cormorant text-[1.4rem] font-semibold text-zinc-800 dark:text-zinc-200 md:mb-2 md:text-2xl">
              {type.label}
            </h3>
            <p className="font-inter text-[11px] leading-4 text-zinc-500 opacity-100 transition-opacity duration-300 dark:text-zinc-400 md:text-sm md:opacity-0 md:group-hover:opacity-100">
              {type.description}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
