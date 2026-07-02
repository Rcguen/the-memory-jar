"use client";

import { motion } from "framer-motion";
import { CapsuleStyle } from "@/types/memory";

interface CapsuleFactoryProps {
  style: CapsuleStyle | null;
  velocityY: number;
  isSleeping: boolean;
}

export function CapsuleFactory({ style, velocityY, isSleeping }: CapsuleFactoryProps) {
  // A slight float/bob effect if it's not sleeping
  const animate = !isSleeping ? {
    y: [0, -5, 0],
    rotate: [0, 2, -2, 0],
  } : {};
  
  const transition: import("framer-motion").Transition = {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  };

  switch (style) {
    case "vintage_parcel":
      return (
        <motion.div animate={animate} transition={transition} className="relative w-full h-full">
          <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-md">
            {/* Brown paper wrap */}
            <rect x="10" y="15" width="80" height="50" rx="3" fill="#8b5a2b" />
            <rect x="10" y="15" width="80" height="50" rx="3" fill="url(#paper-texture)" opacity="0.5" />
            {/* String tying it */}
            <line x1="50" y1="15" x2="50" y2="65" stroke="#e6c280" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="10" y1="40" x2="90" y2="40" stroke="#e6c280" strokeWidth="2" strokeDasharray="4 2" />
            {/* Small tag */}
            <circle cx="50" cy="40" r="6" fill="#fdfbf7" stroke="#e6c280" strokeWidth="1" />
          </svg>
        </motion.div>
      );
      
    case "ribbon_box":
      return (
        <motion.div animate={animate} transition={transition} className="relative w-full h-full">
          <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-md">
            {/* Soft pink box */}
            <rect x="15" y="20" width="70" height="40" rx="2" fill="#f4d0cb" />
            {/* Ribbon */}
            <rect x="42" y="20" width="16" height="40" fill="#c94b5f" opacity="0.9" />
            <rect x="15" y="32" width="70" height="16" fill="#c94b5f" opacity="0.9" />
            {/* Bow */}
            <path d="M50 32 C 40 20, 30 30, 45 40 Z" fill="#b0394a" />
            <path d="M50 32 C 60 20, 70 30, 55 40 Z" fill="#b0394a" />
          </svg>
        </motion.div>
      );
      
    case "wax_capsule":
      return (
        <motion.div animate={animate} transition={transition} className="relative w-full h-full">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
            {/* Scroll */}
            <rect x="25" y="20" width="50" height="60" rx="5" fill="#f5f0e6" />
            <line x1="30" y1="20" x2="30" y2="80" stroke="#e3d6c1" strokeWidth="3" />
            <line x1="70" y1="20" x2="70" y2="80" stroke="#e3d6c1" strokeWidth="3" />
            {/* Giant Wax Seal */}
            <circle cx="50" cy="50" r="18" fill="#8e1a1a" />
            <circle cx="50" cy="50" r="15" fill="#a02020" />
            <path d="M 45 45 L 55 55 M 55 45 L 45 55" stroke="#7a1010" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>
      );
      
    case "glass_capsule":
      return (
        <motion.div animate={animate} transition={transition} className="relative w-full h-full">
          <svg viewBox="0 0 60 100" className="w-full h-full drop-shadow-md">
            {/* Cork */}
            <rect x="20" y="10" width="20" height="15" rx="2" fill="#a37c56" />
            {/* Glass vial */}
            <rect x="15" y="20" width="30" height="70" rx="15" fill="rgba(255, 255, 255, 0.4)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="2" />
            {/* Something glowing inside */}
            <circle cx="30" cy="65" r="8" fill="#ffeb99" filter="url(#glow)" />
          </svg>
        </motion.div>
      );

    case "wooden_box":
      return (
        <motion.div animate={animate} transition={transition} className="relative w-full h-full">
          <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-xl">
            {/* Wood block */}
            <rect x="15" y="20" width="70" height="45" rx="4" fill="#5c3a21" />
            <rect x="15" y="20" width="70" height="10" rx="2" fill="#4a2e1a" />
            {/* Keyhole */}
            <circle cx="50" cy="45" r="4" fill="#1a1005" />
            <path d="M 48 45 L 52 45 L 54 53 L 46 53 Z" fill="#1a1005" />
          </svg>
        </motion.div>
      );

    case "silk_envelope":
    default:
      return (
        <motion.div animate={animate} transition={transition} className="relative w-full h-full">
          <svg viewBox="0 0 100 70" className="w-full h-full drop-shadow-md">
            {/* Envelope body */}
            <rect x="10" y="15" width="80" height="45" rx="3" fill="#e6d5e1" />
            {/* Flap */}
            <path d="M 10 15 L 50 40 L 90 15" fill="#d9c3d3" stroke="#e6d5e1" strokeWidth="1" />
            {/* Small gold lock */}
            <circle cx="50" cy="40" r="5" fill="#d4af37" />
          </svg>
        </motion.div>
      );
  }
}
