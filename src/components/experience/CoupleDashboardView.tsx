"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Flame,
  Heart,
  ImageIcon,
  Mail,
  Mic,
  Sparkles,
  Star,
  TimerReset,
  Video,
  BookOpen,
} from "lucide-react";
import { useCoupleDashboardStats } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHaptics } from "@/hooks/useHaptics";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { useRealtimeMemory } from "@/hooks/useRealtimeMemory";
import { EmojiText } from "@/components/ui/EmojiText";
import { MemoryType } from "@/types/memory";
import { RelationshipAmbientBackdrop } from "./RelationshipAmbientBackdrop";
import { useQueryClient } from "@tanstack/react-query";

type DashboardMetricKey =
  | "togetherDays"
  | "totalMemories"
  | "totalPhotos"
  | "totalVideos"
  | "totalVoices"
  | "totalLetters"
  | "waitingCapsules"
  | "favorites"
  | "currentStreak";

function prettyType(type: MemoryType | null) {
  if (!type) return "Not enough memories yet";
  return type.replace("_", " ");
}

function prettyMonth(value: string | null) {
  if (!value) return "Not enough memories yet";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00Z`));
}

const DASHBOARD_METRICS: Array<{
  key: DashboardMetricKey;
  label: string;
  icon: typeof Heart;
  suffix?: string;
}> = [
  { key: "togetherDays", label: "Together", icon: Heart, suffix: "days" },
  { key: "totalMemories", label: "Memories", icon: Sparkles },
  { key: "totalPhotos", label: "Photos", icon: Camera },
  { key: "totalVideos", label: "Videos", icon: Video },
  { key: "totalVoices", label: "Voices", icon: Mic },
  { key: "totalLetters", label: "Letters", icon: Mail },
  { key: "waitingCapsules", label: "Waiting Capsules", icon: TimerReset },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "currentStreak", label: "Current Streak", icon: Flame, suffix: "months" },
] as const;

export function CoupleDashboardView() {
  const { data: relationship } = useRelationshipContext();
  const { data: stats, isLoading } = useCoupleDashboardStats();
  const { openViewer } = useMemoryViewer();
  const queryClient = useQueryClient();
  const { trigger } = useHaptics();
  const isPhone = useIsPhone();

  useRealtimeMemory(relationship?.relationshipId ?? null, { syncPhysics: false });
  useRoutePrefetch(["/", "/timeline", "/on-this-day"]);
  const pullToRefresh = usePullToRefresh({
    disabled: !isPhone,
    onRefresh: async () => {
      trigger("light");
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats", relationship?.relationshipTimezone] });
    },
  });

  return (
    <main className="relative min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-[var(--surface-base)] px-4 py-8 pb-36 sm:pb-8" {...pullToRefresh.bind}>
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop timezone={relationship.relationshipTimezone} />
      )}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center sm:hidden"
        animate={{ opacity: pullToRefresh.pullDistance > 4 || pullToRefresh.isRefreshing ? 1 : 0, y: Math.min(pullToRefresh.pullDistance, 52) }}
      >
        <div className="surface-ink mt-3 rounded-full border px-4 py-2 text-[11px] tracking-wide">
          {pullToRefresh.isRefreshing ? "Refreshing" : pullToRefresh.pullDistance > 64 ? "Release to refresh" : "Pull for a softer pulse"}
        </div>
      </motion.div>
      <div className="relative z-10 mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <ArrowLeft className="h-4 w-4" />
          Back to jar
        </Link>

        <section className="surface-ink mt-4 px-5 py-6 sm:mt-6 sm:px-8 sm:py-7">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] tracking-wide text-[var(--text-muted)]">
              <Heart className="h-3.5 w-3.5 text-[var(--accent-rose)]" />
              Couple Dashboard
            </div>
            <h1 className="mt-4 font-cormorant text-[2.45rem] leading-none sm:text-5xl">
              A softer look at your story
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-300/85 sm:text-base">
              Not analytics for productivity. Just a gentle portrait of how your love has been unfolding inside the jar.
            </p>
            <div className="mt-6">
              <Link href="/memory-book" className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-rose)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90">
                <BookOpen className="h-4 w-4" />
                Turn these memories into a book
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DASHBOARD_METRICS.map((metric, index) => {
            const Icon = metric.icon;
            const value = stats?.[metric.key] ?? 0;
            return (
              <motion.article
                key={metric.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.04 }}
                className="surface-panel p-4 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="page-kicker">{metric.label}</p>
                  <div className="rounded-full bg-[var(--accent-rose-soft)] p-2 text-[var(--accent-rose)]">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 font-cormorant text-[2.35rem] text-[var(--text-primary)] sm:mt-4 sm:text-4xl">
                  {value}
                </div>
                {metric.suffix && <p className="mt-1 text-sm text-[var(--text-secondary)]">{metric.suffix}</p>}
              </motion.article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="surface-panel p-5">
            <p className="page-kicker">Milestones</p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => stats?.newestMemory && openViewer(stats.newestMemory.id)}
                disabled={!stats?.newestMemory}
                className="surface-paper flex w-full items-start justify-between rounded-xl border px-4 py-4 text-left transition-colors hover:border-[var(--accent-rose)] disabled:cursor-default disabled:opacity-70"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Newest memory</p>
                  <h2 className="mt-2 font-cormorant text-3xl leading-none text-zinc-900 dark:text-zinc-50">
                    <EmojiText text={stats?.newestMemory?.title || "Not enough memories yet"} />
                  </h2>
                </div>
                <ImageIcon className="mt-1 h-4 w-4 text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => stats?.oldestMemory && openViewer(stats.oldestMemory.id)}
                disabled={!stats?.oldestMemory}
                className="surface-paper flex w-full items-start justify-between rounded-xl border px-4 py-4 text-left transition-colors hover:border-[var(--accent-rose)] disabled:cursor-default disabled:opacity-70"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Oldest memory</p>
                  <h2 className="mt-2 font-cormorant text-3xl leading-none text-zinc-900 dark:text-zinc-50">
                    <EmojiText text={stats?.oldestMemory?.title || "Not enough memories yet"} />
                  </h2>
                </div>
                <ImageIcon className="mt-1 h-4 w-4 text-zinc-400" />
              </button>
            </div>
          </div>

          <div className="surface-panel p-5">
            <p className="page-kicker">Patterns</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="surface-paper rounded-xl border px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Most common type</p>
                <p className="mt-3 font-cormorant text-3xl text-zinc-900 capitalize dark:text-zinc-50">
                  {prettyType(stats?.mostCommonMemoryType ?? null)}
                </p>
              </div>
              <div className="surface-paper rounded-xl border px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Most active month</p>
                <p className="mt-3 font-cormorant text-3xl text-zinc-900 dark:text-zinc-50">
                  {prettyMonth(stats?.mostActiveMonth ?? null)}
                </p>
              </div>
              <div className="surface-paper rounded-xl border px-4 py-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Favorite reaction</p>
                <p className="mt-3 font-cormorant text-4xl text-zinc-900 dark:text-zinc-50">
                  {stats?.favoriteReaction ? <EmojiText text={stats.favoriteReaction} /> : "No favorite yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="surface-ink mt-6 rounded-full border px-4 py-2 text-center text-sm">
            Listening for the shape of your story...
          </div>
        )}
      </div>
    </main>
  );
}
