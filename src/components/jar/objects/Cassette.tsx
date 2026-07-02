"use client";
import { motion } from "framer-motion";
export function Cassette({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 64" className="w-full h-full drop-shadow-lg" animate={{ y: !isSleeping && Math.abs(velocityY) > 8 ? [-2, 0] : 0 }} transition={{ type: "spring", stiffness: 300 }}>
      <rect x="2" y="2" width="96" height="60" rx="4" fill="#2a2a2a" stroke="#111" strokeWidth="1" />
      <rect x="10" y="10" width="80" height="30" rx="2" fill="#dfd9c2" />
      <circle cx="30" cy="25" r="8" fill="#111" />
      <circle cx="70" cy="25" r="8" fill="#111" />
      <path d="M 30 25 L 70 25" stroke="#444" strokeWidth="2" />
      <polygon points="20,62 80,62 75,50 25,50" fill="#1a1a1a" />
      <text x="50" y="20" fontFamily="'Inter', sans-serif" fontSize="6" textAnchor="middle" fill="#882222" fontWeight="bold">MIX TAPE</text>
    </motion.svg>
  );
}
