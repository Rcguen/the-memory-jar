"use client";
import { motion } from "framer-motion";
export function WaxSealDoc({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 80 100" className="w-full h-full drop-shadow-lg">
      <rect x="10" y="5" width="60" height="90" rx="2" fill="#fdfbf7" stroke="#e5e5e5" strokeWidth="1" />
      <rect x="8" y="3" width="64" height="94" rx="1" fill="none" stroke="#f4f1e1" strokeWidth="2" />
      <rect x="5" y="45" width="70" height="10" fill="#991b1b" />
      <circle cx="40" cy="50" r="12" fill="#7f1d1d" />
      <circle cx="40" cy="50" r="10" fill="#991b1b" />
      <path d="M 33 43 A 8 8 0 0 1 45 43" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
    </motion.svg>
  );
}
