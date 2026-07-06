"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarHeart, ChevronRight, Sparkles } from "lucide-react";
import { useOnThisDayMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHaptics } from "@/hooks/useHaptics";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { useRealtimeMemory } from "@/hooks/useRealtimeMemory";
import { EmojiText } from "@/components/ui/EmojiText";
import { formatInTimezone } from "@/lib/timezone";
import { RelationshipAmbientBackdrop } from "./RelationshipAmbientBackdrop";
import { useQueryClient } from "@tanstack/react-query";

function formatCurrentLabel(timezone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date());
}

export function OnThisDayView() {
  const { data: relationship } = useRelationshipContext();
  const { data: memories = [], isLoading } = useOnThisDayMemories();
  const { openViewer } = useMemoryViewer();
  const queryClient = useQueryClient();
  const { trigger } = useHaptics();
  const isPhone = useIsPhone();

  useRealtimeMemory(relationship?.relationshipId ?? null, { syncPhysics: false });
  useRoutePrefetch(["/", "/timeline", "/dashboard"]);
  const pullToRefresh = usePullToRefresh({
    disabled: !isPhone,
    onRefresh: async () => {
      trigger("light");
      await queryClient.invalidateQueries({ queryKey: ["on-this-day", relationship?.relationshipTimezone] });
    },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-emerald-50/30 px-4 py-8 pb-36 dark:bg-emerald-950/20 sm:pb-8" {...pullToRefresh.bind}>
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop timezone={relationship.relationshipTimezone} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.16),transparent_48%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_42%)]" />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center sm:hidden"
        animate={{ opacity: pullToRefresh.pullDistance > 4 || pullToRefresh.isRefreshing ? 1 : 0, y: Math.min(pullToRefresh.pullDistance, 52) }}
      >
        <div className="mt-3 rounded-full border border-white/20 bg-zinc-950/65 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-100 shadow-lg backdrop-blur-xl">
          {pullToRefresh.isRefreshing ? "Refreshing" : pullToRefresh.pullDistance > 64 ? "Release to refresh" : "Pull to revisit"}
        </div>
      </motion.div>
      <div className="relative z-10 mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <ArrowLeft className="h-4 w-4" />
          Back to jar
        </Link>

        <section className="mt-4 overflow-hidden rounded-[1.8rem] border border-white/15 bg-zinc-950/55 px-5 py-6 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:mt-6 sm:rounded-[2rem] sm:px-8 sm:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_55%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/15 bg-rose-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-100/80">
                <CalendarHeart className="h-3.5 w-3.5 text-rose-300" />
                On This Day
              </div>
              <h1 className="mt-4 font-cormorant text-[2.5rem] leading-none sm:text-5xl">
                {relationship ? formatCurrentLabel(relationship.relationshipTimezone) : "Today"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-300/85 sm:text-base">
                Memories from this date, across every year you have been collecting pieces of each other.
              </p>
            </div>

            {memories.length > 0 && (
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                {memories.length} {memories.length === 1 ? "memory" : "memories"} waiting
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {isLoading && (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/50 px-5 py-8 text-center text-zinc-500 backdrop-blur-xl dark:bg-zinc-950/40">
              Gathering your daybook...
            </div>
          )}

          {!isLoading && memories.length === 0 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/50 px-5 py-8 text-center text-zinc-500 backdrop-blur-xl dark:bg-zinc-950/40">
              Nothing was tucked into this date yet. Future you will love filling it.
            </div>
          )}

          {memories.map((memory, index) => (
            <motion.button
              key={memory.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.05 }}
              type="button"
              onClick={() => openViewer(memory.id)}
              className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/55 px-5 py-5 text-left shadow-lg backdrop-blur-xl transition-colors hover:bg-white/68 dark:bg-zinc-950/45 dark:hover:bg-zinc-900/55 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_30%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                  {formatInTimezone(`${memory.memory_date}T00:00:00.000Z`, relationship?.relationshipTimezone ?? "UTC", {
                    year: "numeric",
                    month: "long",
                  })}
                </div>
                <h2 className="font-cormorant text-3xl leading-none text-zinc-900 dark:text-zinc-50">
                  <EmojiText text={memory.title || "Untitled memory"} />
                </h2>
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                  <EmojiText text={memory.content || "Open to revisit this moment."} />
                </p>
              </div>

              <div className="relative inline-flex shrink-0 items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300">
                Open memory
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </section>
      </div>
    </main>
  );
}
