"use client";

import { useEffect, useState } from "react";
import { differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from "date-fns";
import { motion } from "framer-motion";

interface RelationshipCounterProps {
  startDate: Date;
}

export function RelationshipCounter({ startDate }: RelationshipCounterProps) {
  const [timeElapsed, setTimeElapsed] = useState("");

  useEffect(() => {
    // Function to calculate exact years, months, and days
    const calculateTime = () => {
      const now = new Date();
      
      const years = differenceInYears(now, startDate);
      const dateAfterYears = addYears(startDate, years);
      
      const months = differenceInMonths(now, dateAfterYears);
      const dateAfterMonths = addMonths(dateAfterYears, months);
      
      const days = differenceInDays(now, dateAfterMonths);

      const parts = [];
      if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
      if (months > 0 || years > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
      parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);

      setTimeElapsed(parts.join(", "));
    };

    calculateTime();
    
    // Update daily at midnight, or just check every hour
    const interval = setInterval(calculateTime, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [startDate]);

  if (!timeElapsed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
      className="flex flex-col items-center gap-1 mt-6 z-10 font-inter"
    >
      <span className="text-sm uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-medium">
        ❤️ Together for
      </span>
      <span className="text-xl md:text-2xl font-cormorant text-zinc-700 dark:text-zinc-300 font-semibold tracking-wide bg-white/30 dark:bg-zinc-800/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/40 dark:border-zinc-700/50 shadow-sm">
        {timeElapsed}
      </span>
    </motion.div>
  );
}
