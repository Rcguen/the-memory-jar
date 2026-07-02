"use client";
import { motion } from "framer-motion";
export function Letter({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 60" className="w-full h-full drop-shadow-md">
      <rect x="2" y="2" width="96" height="56" fill="#f4f1e1" stroke="#d3cec4" strokeWidth="1" />
      <path d="M 2 2 L 50 35 L 98 2" fill="none" stroke="#d3cec4" strokeWidth="1.5" />
      <path d="M 2 58 L 40 30 M 98 58 L 60 30" fill="none" stroke="#d3cec4" strokeWidth="1" />
      <rect x="80" y="5" width="12" height="15" fill="#e5e5e5" stroke="#ccc" strokeWidth="0.5" strokeDasharray="1 1" />
      <circle cx="86" cy="12.5" r="4" fill="#c95050" opacity="0.8" />
    </motion.svg>
  );
}
