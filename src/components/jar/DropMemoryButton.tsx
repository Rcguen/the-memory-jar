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
      <Button
        onClick={openModal}
        size="lg"
        className="surface-ink group relative flex h-auto w-max items-center justify-between gap-6 overflow-hidden rounded-full px-2 py-2 pr-6 pl-8 text-base font-semibold transition-all sm:text-lg font-cormorant tracking-wide"
      >
        <span>Drop a Memory</span>
        <motion.div
          animate={{ scale: isHovered ? 1.05 : 1, x: isHovered ? 2 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10"
        >
          <Plus className="w-5 h-5 text-white dark:text-black transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-90" />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 rounded-full border border-white/15" />
      </Button>
    </motion.div>
  );
}
