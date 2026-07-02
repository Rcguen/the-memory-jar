"use client";
import { motion } from "framer-motion";
export function OrigamiStar({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" animate={{ filter: !isSleeping ? "drop-shadow(0px 0px 8px rgba(253, 224, 71, 0.8))" : "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}>
      <polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" fill="#fef08a" stroke="#eab308" strokeWidth="1" strokeLinejoin="round" />
      <path d="M 50 5 L 50 65 M 50 65 L 95 35 M 50 65 L 5 35 M 50 65 L 78 85 M 50 65 L 22 85" stroke="#ca8a04" strokeWidth="0.5" opacity="0.5" />
    </motion.svg>
  );
}
