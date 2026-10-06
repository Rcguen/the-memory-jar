"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMemoryModal } from "@/providers/memory-modal-provider";

export function DropMemoryButton() {
  const [isHovered, setIsHovered] = useState(false);
  const { openModal } = useMemoryModal();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
      className="relative z-10 mt-2 sm:mt-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer Glow */}
      <motion.div
        className="absolute inset-0 bg-emerald-400/40 dark:bg-emerald-500/30 rounded-full blur-2xl"
        animate={{
          opacity: isHovered ? 0.8 : 0.4,
          scale: isHovered ? 1.2 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      <Button
        onClick={openModal}
        size="lg"
        className="group relative flex h-auto w-max items-center justify-between gap-6 overflow-hidden rounded-full border-0 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] dark:from-white dark:to-zinc-200 px-2 py-2 pr-6 pl-8 text-base font-semibold text-white dark:text-black shadow-[0_12px_40px_rgb(0,0,0,0.4)] dark:shadow-[0_12px_40px_rgb(255,255,255,0.15)] transition-all sm:text-lg font-cormorant tracking-wide"
      >
        <span>Drop a Memory</span>
        <motion.div
          animate={{ scale: isHovered ? 1.05 : 1, x: isHovered ? 2 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 dark:bg-black/10 backdrop-blur-md"
        >
          <Plus className="w-5 h-5 text-white dark:text-black transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-90" />
        </motion.div>

        {/* Sweeping Glass Reflection */}
        <motion.div
          className="absolute inset-0 -skew-x-12 w-12 bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent"
          initial={{ x: "-150%" }}
          animate={{ x: isHovered ? "400%" : "-150%" }}
          transition={{ 
            duration: 0.6, 
            ease: "easeInOut",
            // Reset position immediately when hover ends to be ready for next hover
            ...( !isHovered && { duration: 0 } )
          }}
        />
        
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 rounded-full border border-white/40 pointer-events-none" />
      </Button>
    </motion.div>
  );
}
