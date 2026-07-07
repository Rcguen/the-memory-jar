"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

type TimeOfDay = "morning" | "day" | "evening" | "night";

export function AmbientParticles() {
  const prefersReducedMotion = useReducedMotion();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    let newTime: TimeOfDay = "day";
    if (hour >= 5 && hour < 11) newTime = "morning";
    else if (hour >= 11 && hour < 17) newTime = "day";
    else if (hour >= 17 && hour < 20) newTime = "evening";
    else newTime = "night";
    
    const t = setTimeout(() => setTimeOfDay(newTime), 0);
    return () => clearTimeout(t);

    // Generate stable random particles on mount to avoid hydration mismatch
    if (!prefersReducedMotion) {
      const generated = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
      }));
      setParticles(generated);
    }
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  const particleColors = {
    morning: "bg-orange-300/40", // warm dust
    day: "bg-emerald-200/40",    // light particles
    evening: "bg-amber-400/40",  // golden dust
    night: "bg-yellow-200/60 shadow-[0_0_8px_rgba(253,224,71,0.8)]", // fireflies
  };

  const currentColor = particleColors[timeOfDay];

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${currentColor}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -50, -100],
            x: timeOfDay === "night" ? [0, 20, -20, 0] : [0, 10, -10, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: timeOfDay === "night" ? p.duration * 0.7 : p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
