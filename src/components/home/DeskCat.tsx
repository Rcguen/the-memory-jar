"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DeskCatProps {
  motionActive?: boolean;
  isPhone?: boolean;
}

export function DeskCat({ motionActive = true, isPhone = false }: DeskCatProps) {
  const [state, setState] = useState<"sitting" | "sleeping" | "looking">("sleeping");

  useEffect(() => {
    if (!motionActive || isPhone) return;

    const changeState = () => {
      const states: ("sitting" | "sleeping" | "looking")[] = ["sitting", "sleeping", "looking"];
      setState(states[Math.floor(Math.random() * states.length)]);
    };

    const interval = window.setInterval(changeState, 15000 + Math.random() * 10000);
    return () => window.clearInterval(interval);
  }, [isPhone, motionActive]);

  if (isPhone) return null;

  const activeAnimation =
    state === "sleeping"
      ? { scaleY: [1, 0.95, 1], y: [0, 2, 0], rotate: 0 }
      : state === "looking"
        ? { rotate: [0, 10, -5, 0], scaleY: 1, y: 0 }
        : { y: [0, -1, 0], scaleY: 1, rotate: 0 };

  return (
    <div className="absolute -top-12 right-6 z-20 hidden opacity-70 transition-opacity hover:opacity-100 sm:block">
      <motion.div
        animate={motionActive ? activeAnimation : { scaleY: 1, y: 0, rotate: 0 }}
        transition={
          motionActive
            ? state === "sleeping"
              ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
              : { duration: 2, repeat: Infinity, repeatDelay: 5 }
            : { duration: 0.2 }
        }
        className="relative"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400"
          aria-hidden="true"
        >
          {state === "sleeping" ? (
            <>
              <path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <path d="M4 18h12" />
              <path d="M16 18c1.7 0 3-1.3 3-3s-1.3-3-3-3" />
            </>
          ) : state === "looking" ? (
            <>
              <path d="M12 5c-3.3 0-6 2.7-6 6v7h12v-7c0-3.3-2.7-6-6-6z" />
              <path d="M6 11l-2-2" />
              <path d="M18 11l2-2" />
              <circle cx="9" cy="12" r="1" fill="currentColor" />
              <circle cx="15" cy="12" r="1" fill="currentColor" />
            </>
          ) : (
            <>
              <path d="M12 5c-3.3 0-6 2.7-6 6v7h12v-7c0-3.3-2.7-6-6-6z" />
              <path d="M6 11l-2-2" />
              <path d="M18 11l2-2" />
              <path d="M9 13v2" />
              <path d="M15 13v2" />
            </>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
