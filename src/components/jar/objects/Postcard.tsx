"use client";
import { motion } from "framer-motion";
export function Postcard({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 120 80" className="w-full h-full drop-shadow-md">
      <rect x="2" y="2" width="116" height="76" rx="2" fill="#faf8f0" stroke="#e0dcd0" strokeWidth="1" />
      <line x1="60" y1="10" x2="60" y2="70" stroke="#d3cec4" strokeWidth="1" />
      <rect x="8" y="10" width="45" height="60" fill="#e8e4d9" />
      <line x1="65" y1="30" x2="110" y2="30" stroke="#d3cec4" strokeWidth="0.5" />
      <line x1="65" y1="45" x2="110" y2="45" stroke="#d3cec4" strokeWidth="0.5" />
      <line x1="65" y1="60" x2="110" y2="60" stroke="#d3cec4" strokeWidth="0.5" />
      <rect x="95" y="8" width="15" height="18" fill="#c95050" opacity="0.8" />
    </motion.svg>
  );
}
