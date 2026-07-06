"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ChevronRight, History } from "lucide-react";
import { useTimelineMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHaptics } from "@/hooks/useHaptics";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { useRealtimeMemory } from "@/hooks/useRealtimeMemory";
import { MEMORY_FILTER_OPTIONS } from "@/lib/memoryFilterOptions";
import { Memory, MemoryFilter } from "@/types/memory";
import { EmojiText } from "@/components/ui/EmojiText";
import { cn } from "@/lib/utils";
import { RelationshipAmbientBackdrop } from "./RelationshipAmbientBackdrop";

type TimelineMonthGroup = {
  key: string;
  monthLabel: string;
  memories: Memory[];
};

type TimelineYearGroup = {
  year: string;
  months: TimelineMonthGroup[];
};

function formatMonthLabel(dateString: string) {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(`${dateString}T00:00:00Z`));
}

function groupTimelineMemories(memories: Memory[]): TimelineYearGroup[] {
  const yearMap = new Map<string, Map<string, Memory[]>>();

  for (const memory of memories) {
    const year = memory.memory_date.slice(0, 4);
    const monthKey = memory.memory_date.slice(0, 7);
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const months = yearMap.get(year)!;
    months.set(monthKey, [...(months.get(monthKey) ?? []), memory]);
  }

  return [...yearMap.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([key, monthMemories]) => ({
      key,
      monthLabel: formatMonthLabel(`${key}-01`),
      memories: monthMemories,
    })),
  }));
}

function memoryAccent(memory: Memory) {
  if (memory.type === "photo") return "bg-rose-500";
  if (memory.type === "video") return "bg-amber-400";
  if (memory.type === "voice") return "bg-emerald-400";
  if (memory.type === "letter") return "bg-sky-400";
  return "bg-zinc-400";
}

export function TimelineView() {
  const { data: relationship } = useRelationshipContext();
  const { openViewer } = useMemoryViewer();
  const queryClient = useQueryClient();
  const { trigger } = useHaptics();
  const isPhone = useIsPhone();
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const yearRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTimelineMemories(filter);

  useRealtimeMemory(relationship?.relationshipId ?? null, { syncPhysics: false });
  useRoutePrefetch(["/", "/dashboard", "/on-this-day"]);
  const pullToRefresh = usePullToRefresh({
    disabled: !isPhone,
    onRefresh: async () => {
      trigger("light");
      await queryClient.invalidateQueries({ queryKey: ["timeline-memories", filter] });
    },
  });

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "280px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const memories = useMemo(
    () => data?.pages.flatMap((page) => page.memories) ?? [],
    [data]
  );
  const groups = useMemo(() => groupTimelineMemories(memories), [memories]);
  const years = groups.map((group) => group.year);

  return (
    <main className="relative min-h-screen overflow-hidden bg-emerald-50/30 px-4 py-8 pb-36 dark:bg-emerald-950/20 sm:pb-8" {...pullToRefresh.bind}>
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop timezone={relationship.relationshipTimezone} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_40%)]" />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center sm:hidden"
        animate={{ opacity: pullToRefresh.pullDistance > 4 || pullToRefresh.isRefreshing ? 1 : 0, y: Math.min(pullToRefresh.pullDistance, 52) }}
      >
        <div className="mt-3 rounded-full border border-white/20 bg-zinc-950/65 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-100 shadow-lg backdrop-blur-xl">
          {pullToRefresh.isRefreshing ? "Refreshing" : pullToRefresh.pullDistance > 64 ? "Release to refresh" : "Pull into the story"}
        </div>
      </motion.div>
      <div className="relative z-10 mx-auto flex w-full max-w-7xl gap-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-40 shrink-0 rounded-[1.5rem] border border-white/12 bg-zinc-950/48 p-4 backdrop-blur-xl xl:block">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Jump to year</p>
          <div className="mt-4 space-y-2">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => yearRefs.current.get(year)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="block w-full rounded-full border border-white/8 bg-white/5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-white/10"
              >
                {year}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <ArrowLeft className="h-4 w-4" />
            Back to jar
          </Link>

          <section className="mt-4 overflow-hidden rounded-[1.8rem] border border-white/15 bg-zinc-950/55 px-5 py-6 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:mt-6 sm:rounded-[2rem] sm:px-8 sm:py-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_55%)]" />
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-100/80">
                    <History className="h-3.5 w-3.5 text-emerald-300" />
                    Timeline
                  </div>
                  <h1 className="mt-4 font-cormorant text-[2.5rem] leading-none sm:text-5xl">
                    Your story, year by year
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm text-zinc-300/85 sm:text-base">
                    Wander through the relationship like a journal: months, milestones, little notes, and all the days in between.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-200 sm:text-sm">
                  {memories.length} memories loaded
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {MEMORY_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
                      filter === option.id
                        ? "bg-emerald-500 text-white"
                        : "bg-white/8 text-zinc-300 hover:bg-white/12 hover:text-zinc-100"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 space-y-8">
            {isLoading && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/55 px-5 py-8 text-center text-zinc-500 backdrop-blur-xl dark:bg-zinc-950/40">
                Gathering your years...
              </div>
            )}

            {!isLoading && groups.length === 0 && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/55 px-5 py-8 text-center text-zinc-500 backdrop-blur-xl dark:bg-zinc-950/40">
                No memories match this view yet.
              </div>
            )}

            <AnimatePresence initial={false}>
              {groups.map((group) => (
                <motion.section
                  key={group.year}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div
                    ref={(node) => {
                      if (node) {
                        yearRefs.current.set(group.year, node);
                      } else {
                        yearRefs.current.delete(group.year);
                      }
                    }}
                    className="sticky top-3 z-20 mb-4 inline-flex rounded-full border border-white/12 bg-zinc-950/65 px-4 py-2 font-cormorant text-lg text-zinc-50 shadow-lg backdrop-blur-xl sm:text-2xl"
                  >
                    {group.year}
                  </div>

                  <div className="space-y-6">
                    {group.months.map((month) => (
                      <div key={month.key} className="rounded-[1.4rem] border border-white/10 bg-white/50 p-4 backdrop-blur-xl dark:bg-zinc-950/35 sm:rounded-[1.5rem] sm:p-5">
                        <div className="sticky top-14 z-10 -mx-1 mb-4 flex items-center gap-2 rounded-full bg-white/72 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500 backdrop-blur-lg dark:bg-zinc-950/72 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:backdrop-blur-0">
                          <CalendarDays className="h-4 w-4 text-emerald-500" />
                          {month.monthLabel}
                        </div>

                        <div className="space-y-3">
                          {month.memories.map((memory) => (
                            <motion.button
                              key={memory.id}
                              type="button"
                              whileHover={isPhone ? undefined : { x: 2 }}
                              onClick={() => openViewer(memory.id)}
                              className="group flex w-full items-start gap-3 rounded-[1.2rem] border border-white/10 bg-white/70 px-4 py-4 text-left transition-colors hover:bg-white/85 dark:bg-zinc-950/50 dark:hover:bg-zinc-900/58 sm:gap-4"
                            >
                              <span className={cn("mt-1 block h-3 w-3 shrink-0 rounded-full shadow-sm", memoryAccent(memory))} />
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  <span>{memory.type.replace("_", " ")}</span>
                                  <span className="opacity-50">•</span>
                                  <span>{new Date(`${memory.memory_date}T00:00:00Z`).getUTCDate()}</span>
                                </div>
                                <h2 className="font-cormorant text-[2rem] leading-none text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                                  <EmojiText text={memory.title || "Untitled memory"} />
                                </h2>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                  <EmojiText text={memory.content || "Open to revisit this memory."} />
                                </p>
                              </div>
                              <span className="mt-1 hidden shrink-0 items-center gap-1 text-sm text-zinc-500 transition-transform group-hover:translate-x-1 dark:text-zinc-300 sm:inline-flex">
                                Open
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              ))}
            </AnimatePresence>

            <div ref={loadMoreRef} className="h-10" />
            {isFetchingNextPage && (
              <div className="rounded-full border border-white/10 bg-zinc-950/55 px-4 py-2 text-center text-sm text-zinc-200 backdrop-blur-xl">
                Turning the next page...
              </div>
            )}
            {!hasNextPage && memories.length > 0 && (
              <div className="rounded-full border border-white/10 bg-zinc-950/45 px-4 py-2 text-center text-sm text-zinc-300 backdrop-blur-xl">
                You have reached the beginning of the story.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
