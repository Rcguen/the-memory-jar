"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

interface CozyDetailsProps {
  motionActive?: boolean;
  isPhone?: boolean;
}

export function CozyDetails({ motionActive = true, isPhone = false }: CozyDetailsProps) {
  const [hour, setHour] = useState(12);

  useEffect(() => {
    const updateHour = () => setHour(new Date().getHours());
    const initialSync = window.setTimeout(updateHour, 0);

    if (!motionActive) {
      return () => window.clearTimeout(initialSync);
    }

    const interval = window.setInterval(updateHour, 60000);
    return () => {
      window.clearTimeout(initialSync);
      window.clearInterval(interval);
    };
  }, [motionActive]);

  const timeOfDay = useMemo(() => {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  }, [hour]);

  const fireflies = useMemo(
    () => [
      { duration: 4.8, delay: -1.2, left: 32, top: 62, xDest: 8, yDest: -14 },
      { duration: 5.6, delay: -2.8, left: 68, top: 44, xDest: -9, yDest: -10 },
    ],
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl">
      {timeOfDay === "morning" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-200 to-transparent"
        />
      )}

      {timeOfDay === "afternoon" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-900"
        />
      )}

      {timeOfDay === "evening" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          className="absolute inset-0 bg-gradient-to-l from-orange-400/20 to-transparent mix-blend-overlay"
        />
      )}

      {timeOfDay === "night" && (
        <div className="absolute inset-0 opacity-30">
          {fireflies.map((firefly, index) => {
            const animateFirefly = motionActive && !isPhone;
            return (
              <motion.div
                key={index}
                animate={
                  animateFirefly
                    ? {
                        opacity: [0.2, 0.8, 0.2],
                        scale: [0.9, 1.15, 0.9],
                        x: [0, firefly.xDest, 0],
                        y: [0, firefly.yDest, 0],
                      }
                    : { opacity: 0.45, scale: 1, x: 0, y: 0 }
                }
                transition={
                  animateFirefly
                    ? {
                        duration: firefly.duration,
                        repeat: Infinity,
                        delay: firefly.delay,
                        ease: "easeInOut",
                      }
                    : { duration: 0.2 }
                }
                className="absolute h-1 w-1 rounded-full bg-yellow-200"
                style={{ left: `${firefly.left}%`, top: `${firefly.top}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
