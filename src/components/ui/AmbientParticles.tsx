"use client";

import { useEffect, useState } from "react";

type TimeOfDay = "morning" | "day" | "evening" | "night";

const PARTICLES = [
  { id: 0, x: 12, y: 18, size: 2 },
  { id: 1, x: 31, y: 67, size: 1 },
  { id: 2, x: 48, y: 34, size: 2 },
  { id: 3, x: 66, y: 76, size: 1 },
  { id: 4, x: 82, y: 24, size: 2 },
  { id: 5, x: 91, y: 58, size: 1 },
] as const;

export function AmbientParticles() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");

  useEffect(() => {
    const hour = new Date().getHours();
    const nextTime: TimeOfDay =
      hour >= 5 && hour < 11
        ? "morning"
        : hour >= 11 && hour < 17
          ? "day"
          : hour >= 17 && hour < 20
            ? "evening"
            : "night";
    const timer = window.setTimeout(() => setTimeOfDay(nextTime), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const particleColors = {
    morning: "bg-orange-300/30",
    day: "bg-emerald-200/30",
    evening: "bg-amber-400/30",
    night: "bg-yellow-200/45 shadow-[0_0_6px_rgba(253,224,71,0.45)]",
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((particle) => (
        <span
          key={particle.id}
          className={`absolute rounded-full ${particleColors[timeOfDay]}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
    </div>
  );
}
