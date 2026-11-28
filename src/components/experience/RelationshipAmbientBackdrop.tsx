"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getTimezonePeriod } from "@/lib/timezone";
import { useUnlockScheduler } from "@/providers/unlock-scheduler";
import { useIsPhone } from "@/hooks/useIsPhone";

interface Spark {
  id: number;
  left: number;
  top: number;
  size: number;
}

function createAmbientParticles(count: number, minSize: number, maxSize: number): Spark[] {
  return Array.from({ length: count }).map((_, index) => {
    const sizeStep = count <= 1 ? 0 : index / (count - 1);
    return {
      id: index,
      left: (13 + index * 37) % 100,
      top: (29 + index * 53) % 100,
      size: minSize + sizeStep * (maxSize - minSize),
    };
  });
}

export function RelationshipAmbientBackdrop({
  timezone,
  motionActive = true,
  isPhone: phoneOverride,
}: {
  timezone: string;
  motionActive?: boolean;
  isPhone?: boolean;
}) {
  const { now } = useUnlockScheduler();
  const reduceMotion = useReducedMotion();
  const detectedIsPhone = useIsPhone();
  const isPhone = phoneOverride ?? detectedIsPhone;
  const shouldAnimate = motionActive && !reduceMotion && !isPhone;
  const period = getTimezonePeriod(timezone, now);
  const isNight = period === "night";
  const isConstrainedDevice = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const memory = "deviceMemory" in navigator ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0 : 0;
    const cores = navigator.hardwareConcurrency ?? 4;
    const saveData = "connection" in navigator
      ? Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
      : false;
    return saveData || memory > 0 && memory <= 4 || cores <= 4;
  }, []);
  const stars = useMemo(() => {
    if (reduceMotion) return [];
    const count = isPhone ? (isConstrainedDevice ? 5 : 9) : 18;
    return createAmbientParticles(count, 1, isPhone ? 2.2 : 2.8);
  }, [isConstrainedDevice, isPhone, reduceMotion]);
  const fireflies = useMemo(() => {
    if (reduceMotion) return [];
    const count = isPhone ? (isConstrainedDevice ? 2 : 4) : 7;
    return createAmbientParticles(count, isPhone ? 2.4 : 3, isPhone ? 4.8 : 6);
  }, [isConstrainedDevice, isPhone, reduceMotion]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent opacity-70 dark:from-white/[0.03]" />

      {period === "morning" && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-7rem] h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(252,211,77,0.14)_0%,rgba(245,158,11,0.05)_45%,transparent_72%)] blur-3xl sm:-top-32 sm:h-[26rem] sm:w-[26rem] dark:bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.10)_0%,rgba(217,119,6,0.03)_50%,transparent_75%)]"
          animate={shouldAnimate ? { scale: [1, 1.05, 1], opacity: [0.65, 0.9, 0.65] } : { scale: 1, opacity: 0.75 }}
          transition={shouldAnimate ? { duration: 9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        />
      )}

      {isNight && (
        <>
          {stars.map((star) => (
            <motion.span
              key={star.id}
              aria-hidden="true"
              className="absolute rounded-full bg-white/55"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
              }}
              animate={{ opacity: 0.55, scale: 1 }}
              transition={{ duration: 0.2 }}
            />
          ))}
          {fireflies.map((fly) => (
            <motion.span
              key={fly.id}
              aria-hidden="true"
              className="absolute rounded-full bg-emerald-200/45"
              style={{
                left: `${fly.left}%`,
                top: `${fly.top}%`,
                width: `${fly.size}px`,
                height: `${fly.size}px`,
              }}
              animate={{ x: 0, y: 0, opacity: 0.42 }}
              transition={{ duration: 0.2 }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/[0.05] to-transparent dark:from-black/10" />
        </>
      )}
    </div>
  );
}
