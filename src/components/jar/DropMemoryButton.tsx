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
      className="relative z-10 mt-6 sm:mt-8"
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
        className="group relative flex h-auto w-[min(100vw-3rem,21rem)] items-center justify-center gap-2 overflow-hidden rounded-full border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-[0_8px_30px_rgb(16,185,129,0.3)] transition-all dark:from-emerald-600 dark:to-emerald-700 hover:from-emerald-400 hover:to-emerald-500 sm:w-auto sm:px-8 sm:text-lg font-inter"
      >
        <motion.div
          animate={{ rotate: isHovered ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </motion.div>
        <span>Drop a Memory</span>

        {/* Sweeping Glass Reflection */}
        <motion.div
          className="absolute inset-0 -skew-x-12 w-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
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
