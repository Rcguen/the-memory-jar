"use client";
import { motion } from "framer-motion";
export function GlowingNote({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 80 60" className="w-full h-full" animate={{ y: !isSleeping ? [0, -5, 0] : 0, filter: "drop-shadow(0px 0px 10px rgba(252, 165, 165, 0.6))" }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
      <path d="M 10 10 Q 40 5 70 15 Q 75 30 70 50 Q 40 55 10 45 Q 5 30 10 10" fill="#fecaca" opacity="0.9" />
      <text x="40" y="32" fontFamily="'Cormorant Garamond', serif" fontSize="14" textAnchor="middle" fill="#991b1b" opacity="0.7">Thankful</text>
    </motion.svg>
  );
}
