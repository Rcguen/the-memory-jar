"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getTimezonePeriod } from "@/lib/timezone";
import { useUnlockScheduler } from "@/providers/unlock-scheduler";

interface Spark {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

function createAmbientParticles(count: number, minSize: number, maxSize: number): Spark[] {
  return Array.from({ length: count }).map((_, index) => ({
    id: index,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: minSize + Math.random() * (maxSize - minSize),
    delay: Math.random() * -8,
    duration: 6 + Math.random() * 10,
  }));
}

export function RelationshipAmbientBackdrop({ timezone }: { timezone: string }) {
  const { now } = useUnlockScheduler();
  const reduceMotion = useReducedMotion();
  const period = getTimezonePeriod(timezone, now);
  const isNight = period === "night";
  const stars = useMemo(() => (reduceMotion ? [] : createAmbientParticles(18, 1, 2.8)), [reduceMotion]);
  const fireflies = useMemo(() => (reduceMotion ? [] : createAmbientParticles(7, 3, 6)), [reduceMotion]);

  const glowClass = useMemo(() => {
    if (period === "morning") {
      return "from-amber-100/40 via-white/10 to-transparent dark:from-amber-300/10";
    }
    if (period === "day") {
      return "from-emerald-100/20 via-white/5 to-transparent dark:from-emerald-300/10";
    }
    if (period === "evening") {
      return "from-rose-200/20 via-amber-100/10 to-transparent dark:from-rose-400/10";
    }
    return "from-sky-200/10 via-transparent to-transparent dark:from-sky-400/10";
  }, [period]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_50%)] opacity-80`}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${glowClass}`} />

      {period === "morning" && (
        <motion.div
          aria-hidden="true"
          className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-100/35 blur-3xl dark:bg-amber-300/10"
          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1], opacity: [0.5, 0.72, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {isNight && (
        <>
          {stars.map((star) => (
            <motion.span
              key={star.id}
              aria-hidden="true"
              className="absolute rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.45)]"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
              }}
              animate={reduceMotion ? undefined : { opacity: [0.25, 0.95, 0.35], scale: [1, 1.35, 1] }}
              transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: "easeInOut" }}
            />
          ))}
          {fireflies.map((fly) => (
            <motion.span
              key={fly.id}
              aria-hidden="true"
              className="absolute rounded-full bg-emerald-200/70 blur-[1px] shadow-[0_0_18px_rgba(110,231,183,0.55)]"
              style={{
                left: `${fly.left}%`,
                top: `${fly.top}%`,
                width: `${fly.size}px`,
                height: `${fly.size}px`,
              }}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      x: [0, 18, -10, 0],
                      y: [0, -10, 12, 0],
                      opacity: [0.15, 0.8, 0.25],
                    }
              }
              transition={{ duration: fly.duration, repeat: Infinity, delay: fly.delay, ease: "easeInOut" }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-emerald-950/12 to-transparent" />
        </>
      )}
    </div>
  );
}
