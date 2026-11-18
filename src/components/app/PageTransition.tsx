"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="app-page-transition flex min-h-0 flex-1 flex-col"
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transformTemplate={({ y }) => {
          if (y === undefined || y === 0 || y === "0" || y === "0px") return "none";
          return `translateY(${typeof y === "number" ? `${y}px` : y})`;
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                opacity: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                y: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
              }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
