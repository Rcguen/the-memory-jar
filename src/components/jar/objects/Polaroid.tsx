"use client";
import { motion } from "framer-motion";
export function Polaroid({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" animate={{ rotate: !isSleeping && Math.abs(velocityY) > 5 ? [-2, 2, 0] : 0 }} transition={{ duration: 0.2 }}>
      <rect x="5" y="5" width="90" height="110" rx="2" fill="#fdfbf7" stroke="#e5e5e5" strokeWidth="1" />
      <rect x="10" y="10" width="80" height="80" fill="#1a1a1a" />
      <polygon points="10,10 90,10 10,90" fill="rgba(255,255,255,0.05)" />
      <text x="50" y="105" fontFamily="'Cormorant Garamond', serif" fontSize="10" textAnchor="middle" fill="#666" fontStyle="italic" opacity="0.6">Captured</text>
    </motion.svg>
  );
}
