"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useIsPhone } from "@/hooks/useIsPhone";

type PageTransitionProps = {
  children: ReactNode;
};

const pageVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { opacity: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  },
  exit: {
    opacity: 0,
    transition: { opacity: { duration: 0.18, ease: [0.4, 0, 1, 1] as const } },
  },
};

const phonePageVariants = {
  initial: { opacity: 0, clipPath: "inset(0 0 0 100%)" },
  enter: {
    opacity: 1,
    clipPath: "inset(0 0 0 0%)",
    transition: {
      opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
      clipPath: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
    },
  },
  exit: {
    opacity: 0,
    clipPath: "inset(0 100% 0 0%)",
    transition: {
      opacity: { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
      clipPath: { duration: 0.26, ease: [0.4, 0, 1, 1] as const },
    },
  },
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isPhone = useIsPhone();
  const variants = isPhone && !shouldReduceMotion ? phonePageVariants : pageVariants;

  return (
    <AnimatePresence mode="sync" initial={false} presenceAffectsLayout={false}>
      <motion.div
        key={pathname}
        className="app-page-transition flex min-h-0 flex-1 flex-col"
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        transition={shouldReduceMotion ? { duration: 0 } : undefined}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
