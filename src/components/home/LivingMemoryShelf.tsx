"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

export function LivingMemoryShelf({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={`relative group ${className || ""}`}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Subtle dust particles on hover */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -10, 0],
              x: [0, i % 2 === 0 ? 5 : -5, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
            className="absolute w-1 h-1 bg-white/20 rounded-full blur-[1px]"
            style={{
              left: `${30 + i * 20}%`,
              top: `${80 - i * 15}%`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 transition-shadow duration-500 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl">
        {children}
      </div>
    </motion.div>
  );
}
