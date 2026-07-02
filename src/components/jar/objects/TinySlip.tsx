"use client";
import { motion } from "framer-motion";
export function TinySlip({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 60 40" className="w-full h-full drop-shadow-sm" animate={{ rotate: !isSleeping ? [0, 5, 0] : 0 }}>
      <polygon points="5,5 55,2 58,35 2,38" fill="#fefce8" stroke="#fef08a" strokeWidth="1" />
      <line x1="10" y1="15" x2="50" y2="13" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="10" y1="25" x2="40" y2="23" stroke="#cbd5e1" strokeWidth="1" />
    </motion.svg>
  );
}
