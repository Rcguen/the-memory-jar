"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useMemoryModal } from "@/providers/memory-modal-provider";

export function DropMemoryButton() {
  const [isHovered, setIsHovered] = useState(false);
  const { openModal } = useMemoryModal();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 340, damping: 28 }
      }
      className="relative z-10 mt-2 sm:mt-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.button
        type="button"
        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        onClick={openModal}
        className="surface-ink group relative flex h-auto w-max cursor-pointer items-center justify-between gap-6 overflow-hidden rounded-full px-2 py-2 pr-6 pl-8 font-cormorant text-base font-semibold tracking-wide shadow-[var(--shadow-2)] transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-lg sm:text-lg"
      >
        <span>Drop a Memory</span>
        <motion.div
          animate={{ scale: isHovered ? 1.08 : 1, x: isHovered ? 2 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10"
        >
          <Plus className="h-5 w-5 text-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-90 dark:text-black" />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 rounded-full border border-white/15" />
      </motion.button>
    </motion.div>
  );
}
