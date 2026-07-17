"use client";

import { useMemo } from "react";
import { useHomeMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { differenceInDays, addMonths, addYears, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { Calendar, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function NextMomentCard({ className }: { className?: string }) {
  const { data: memories = [] } = useHomeMemories();
  const { data: relationshipContext } = useRelationshipContext();

  const nextMoment = useMemo(() => {
    const now = new Date();
    let capsuleDays = Infinity;
    let anniversaryDays = Infinity;
    let momentType: "capsule" | "anniversary" = "capsule";
    let daysRemaining = 0;

    // Find next capsule
    const capsules = memories.filter(m => m.unlock_at && new Date(m.unlock_at).getTime() > now.getTime());
    if (capsules.length > 0) {
      const nextCapsule = capsules.sort((a, b) => new Date(a.unlock_at!).getTime() - new Date(b.unlock_at!).getTime())[0];
      capsuleDays = differenceInDays(new Date(nextCapsule.unlock_at!), now);
    }

    // Find next anniversary
    if (relationshipContext?.startDate) {
      const start = new Date(relationshipContext.startDate);
      // Let's find the next month-versary or year-versary
      let nextAnniv = addMonths(start, 1);
      while (!isAfter(nextAnniv, now)) {
        nextAnniv = addMonths(nextAnniv, 1);
      }
      anniversaryDays = differenceInDays(nextAnniv, now);
    }

    if (capsuleDays === Infinity && anniversaryDays === Infinity) {
      return null;
    }

    if (capsuleDays < anniversaryDays) {
      momentType = "capsule";
      daysRemaining = capsuleDays;
    } else {
      momentType = "anniversary";
      daysRemaining = anniversaryDays;
    }

    return { type: momentType, days: daysRemaining };
  }, [memories, relationshipContext]);

  if (!nextMoment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className={cn(
        "surface-paper flex flex-col justify-center border-dashed p-4",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-stone-500 font-semibold mb-2">
        {nextMoment.type === "capsule" ? <Lock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
        <span>{nextMoment.type === "capsule" ? "Next Capsule" : "Next Milestone"}</span>
      </div>
      
      <div className="mt-auto">
        <p className="font-cormorant text-3xl sm:text-4xl text-[color:var(--jar-forest)] leading-none mb-1">
          {nextMoment.days}
        </p>
        <p className="text-xs text-stone-500">
          days remaining
        </p>
      </div>
    </motion.div>
  );
}
