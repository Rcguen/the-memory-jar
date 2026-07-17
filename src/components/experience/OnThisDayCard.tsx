"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarHeart, ChevronRight, Sparkles } from "lucide-react";
import { useOnThisDayMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { EmojiText } from "@/components/ui/EmojiText";
import { cn } from "@/lib/utils";

function formatTodayLabel(timezone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date());
}

export function OnThisDayCard({ className }: { className?: string }) {
  const { data: relationship } = useRelationshipContext();
  const { data: memories = [] } = useOnThisDayMemories();

  if (!relationship || memories.length === 0) return null;

  const leadMemory = memories[0];
  const title =
    memories.length === 1
      ? leadMemory.title || "A memory worth revisiting"
      : `${memories.length} memories from this day`;

  return (
    <Link href="/on-this-day" prefetch={false} className={cn("block w-full max-w-2xl", className)}>
      <motion.article
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-[1.6rem] border border-white/15 bg-zinc-950/55 px-5 py-5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.14),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200/15 bg-rose-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-100/80">
              <CalendarHeart className="h-3.5 w-3.5 text-rose-300" />
              On This Day
            </div>
            <h2 className="font-cormorant text-3xl leading-none text-zinc-50">
              {formatTodayLabel(relationship.relationshipTimezone)}
            </h2>
            <p className="mt-3 text-sm text-zinc-300/85">
              <span className="font-medium text-rose-100">One day, many versions of your love.</span>
            </p>
            <p className="mt-4 line-clamp-2 text-lg text-zinc-100">
              <EmojiText text={title} />
            </p>
            {memories.length > 1 && (
              <p className="mt-2 text-sm text-zinc-400">
                Open the daybook to revisit each one.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-4">
            <div className="rounded-full bg-white/10 p-2.5 text-rose-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-zinc-300">
              Open
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
