"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
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
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                opacity: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
              }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
