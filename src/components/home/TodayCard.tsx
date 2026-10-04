"use client";

import { useMemo, useState, useEffect } from "react";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useHomeMemories } from "@/hooks/useMemoryData";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function TodayCard({ className }: { className?: string }) {
  const { data: relationshipContext } = useRelationshipContext();
  const { data: memories = [] } = useHomeMemories();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    // Ideally use relationship timezone, but fallback to local hour
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 22) return "Good Evening";
    return "Good Night";
  }, [currentTime]);

  const dynamicSentence = useMemo(() => {
    const sentences: string[] = [];

    // 1. Days together
    if (relationshipContext?.startDate) {
      const days = differenceInDays(currentTime, new Date(relationshipContext.startDate));
      sentences.push(`You've been together for ${days} days.`);
    }

    // 2. Haven't written today
    const today = new Date().toDateString();
    const writtenToday = memories.some(m => new Date(m.created_at).toDateString() === today);
    if (!writtenToday && memories.length > 0) {
      sentences.push("You haven't written anything today.");
    }

    // 3. Time capsule opens tomorrow
    const capsules = memories.filter(m => m.unlock_at && new Date(m.unlock_at).getTime() > currentTime.getTime());
    const tomorrowCapsule = capsules.find(m => differenceInDays(new Date(m.unlock_at!), currentTime) === 1);
    if (tomorrowCapsule) {
      sentences.push("A Time Capsule opens tomorrow.");
    }

    // 4. Last memory was X days ago
    if (memories.length > 0) {
      const lastMemory = memories[0];
      const daysAgo = differenceInDays(currentTime, new Date(lastMemory.created_at));
      if (daysAgo > 1) {
        sentences.push(`Your last memory was ${daysAgo} days ago.`);
      }
    }

    if (sentences.length === 0) return "A quiet day for making memories.";

    // Rotate predictably based on the day and hour
    const seed = currentTime.getDate() + currentTime.getHours();
    return sentences[seed % sentences.length];
  }, [relationshipContext, memories, currentTime]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
      className={cn("double-bezel group cursor-default", className)}
    >
      <div className="double-bezel-inner paper-surface p-8 h-full flex flex-col justify-center transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[0.98]">
        <span className="editorial-kicker text-zinc-500 mb-4 inline-flex px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full w-max">
          Today
        </span>
        <h2 className="type-hero text-[color:var(--jar-ink)] dark:text-amber-50 mb-3">{greeting}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">{dynamicSentence}</p>
      </div>
    </motion.div>
  );
}
