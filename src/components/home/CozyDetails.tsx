"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function CozyDetails() {
  const [hour, setHour] = useState(() => 
    typeof window !== "undefined" ? new Date().getHours() : 12
  );
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const interval = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  const timeOfDay = useMemo(() => {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  }, [hour]);

  const [fireflies] = useState(() => 
    Array.from({ length: 5 }).map(() => ({
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
      left: 20 + Math.random() * 60,
      top: 30 + Math.random() * 50,
      xDest: Math.random() * 20 - 10,
      yDest: Math.random() * -20,
    }))
  );

  if (reduceMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
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
           {/* Tiny fireflies */}
           {fireflies.map((ff, i) => (
             <motion.div
               key={i}
               animate={{ 
                 opacity: [0, 1, 0],
                 scale: [0.8, 1.2, 0.8],
                 x: [0, ff.xDest, 0],
                 y: [0, ff.yDest, 0]
               }}
               transition={{ 
                 duration: ff.duration, 
                 repeat: Infinity, 
                 delay: ff.delay 
               }}
               className="absolute w-1 h-1 rounded-full bg-yellow-200 blur-[1px]"
               style={{ 
                 left: `${ff.left}%`, 
                 top: `${ff.top}%` 
               }}
             />
           ))}
        </div>
      )}
    </div>
  );
}
