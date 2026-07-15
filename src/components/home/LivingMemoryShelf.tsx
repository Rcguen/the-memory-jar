"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

export function LivingMemoryShelf({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={`group relative ${className || ""}`}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      >
        {[30, 50, 70].map((left, index) => (
          <span
            key={left}
            className="absolute h-1.5 w-1.5 rounded-full bg-white/10"
            style={{ left: `${left}%`, top: `${80 - index * 15}%` }}
          />
        ))}
      </div>

      <div className="relative z-10 rounded-3xl transition-shadow duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        {children}
      </div>
    </motion.div>
  );
}
