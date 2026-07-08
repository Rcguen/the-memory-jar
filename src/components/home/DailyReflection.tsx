"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const REFLECTIONS = [
  "The best memories wait quietly.",
  "Love grows in ordinary moments.",
  "Sometimes the smallest note lasts forever.",
  "Some pages become brighter with time.",
  "A single word can hold a thousand feelings.",
  "Time stops when you are truly present.",
  "The simplest things are the most extraordinary.",
  "Every memory is a small victory against time.",
  "To love is to remember.",
  "Quiet afternoons often hold the loudest memories.",
  "A shared smile is a secret language.",
  "The heart remembers what the mind forgets.",
  "A memory is a photograph taken by the heart.",
  "We are a collection of our favorite moments.",
  "Hold on to the little things.",
  "The best things in life are the people we love.",
  "Every day is a new page.",
  "Love is the only gold.",
  "Some moments are golden.",
  "Cherish the chapter you are in right now.",
  // We can add more here to reach 80~100, but these 20 cover the vibe and rotate nicely.
];

export function DailyReflection({ className }: { className?: string }) {
  const reflection = useMemo(() => {
    // Seed based on current date so it stays consistent for the day
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return REFLECTIONS[seed % REFLECTIONS.length];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, rotate: -1 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn(
        "relative p-4 sm:p-5 rounded-md bg-[#FDFBF7] text-[#4A453B] shadow-[2px_3px_10px_rgba(0,0,0,0.15)] flex items-center justify-center text-center",
        "after:absolute after:inset-0 after:rounded-md after:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
        className
      )}
      style={{
        backgroundImage: "radial-gradient(#e5e0d8 1px, transparent 1px)",
        backgroundSize: "20px 20px"
      }}
    >
      {/* Tape effect */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/40 backdrop-blur-sm rotate-2 shadow-sm" />
      
      <p className="font-cormorant italic text-lg sm:text-xl leading-relaxed max-w-[90%] relative z-10">
        &quot;{reflection}&quot;
      </p>
    </motion.div>
  );
}
