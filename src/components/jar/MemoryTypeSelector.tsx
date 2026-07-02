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
  X 
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
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

export function MemoryTypeSelector({ onSelect, onCancel }: MemoryTypeSelectorProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.5 } }}
      className="m-auto w-full max-w-4xl flex flex-col items-center justify-center min-h-[60vh] px-4 relative"
    >
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-0 right-4 p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/5 transition-colors z-50 group"
        >
          <X className="w-6 h-6 text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors" />
        </button>
      )}

      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="text-3xl md:text-5xl font-cormorant text-zinc-800 dark:text-zinc-200 mb-4"
      >
        What would you like to preserve?
      </motion.h2>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="font-inter text-zinc-500 dark:text-zinc-400 mb-12 text-center"
      >
        Select a memory type to begin.
      </motion.p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full">
        {MEMORY_TYPES.map((type) => (
          <motion.button
            key={type.id}
            variants={itemVariants}
            onClick={() => onSelect(type.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-white/40 dark:bg-zinc-900/40 hover:bg-white/60 dark:hover:bg-zinc-800/60 border border-white/50 dark:border-zinc-800/50 backdrop-blur-md transition-colors text-center overflow-hidden"
          >
            {/* Subtle hover sweep */}
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
      </div>
    </motion.div>
  );
}
