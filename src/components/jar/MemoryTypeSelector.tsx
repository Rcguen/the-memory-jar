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
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="m-auto w-full max-w-4xl flex flex-col items-center justify-center min-h-[60vh] px-4 relative"
    >
      {onCancel && (
        <motion.button
          type="button"
          onClick={onCancel}
          whileHover={{ scale: 1.08, rotate: 90 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="absolute top-0 right-4 p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/5 transition-colors z-50 group"
          aria-label="Close memory type selector"
        >
          <X className="w-6 h-6 text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors" />
        </motion.button>
      )}

      <motion.h2
        variants={titleVariants}
        className="text-3xl md:text-5xl font-cormorant text-zinc-800 dark:text-zinc-200 mb-4"
      >
        What would you like to preserve?
      </motion.h2>

      <motion.p
        variants={subtitleVariants}
        className="font-inter text-zinc-500 dark:text-zinc-400 mb-12 text-center"
      >
        Select a memory type to begin.
      </motion.p>

      <motion.div variants={gridVariants} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full">
        {MEMORY_TYPES.map((type) => (
          <motion.button
            key={type.id}
            variants={itemVariants}
            onClick={() => onSelect(type.id)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-white/40 dark:bg-zinc-900/40 hover:bg-white/60 dark:hover:bg-zinc-800/60 border border-white/50 dark:border-zinc-800/50 backdrop-blur-md transition-colors text-center overflow-hidden"
          >
            <div className="absolute inset-0 -translate-x-[150%] skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-sweep pointer-events-none" />

            <type.icon className="w-8 h-8 md:w-10 md:h-10 text-rose-500/70 dark:text-rose-400/70 mb-4 transition-transform group-hover:scale-110 duration-500" />
            <h3 className="font-cormorant text-xl md:text-2xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              {type.label}
            </h3>
            <p className="font-inter text-xs md:text-sm text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {type.description}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}