"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  ChevronLeft,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  Pin,
  PinOff,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useActivityFeed, useMemories } from "@/hooks/useMemoryData";
import { useAuth } from "@/providers/auth-provider";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { usePhysics } from "@/providers/physics-provider";
import { memoryService } from "@/services/memory";
import { ActivityLog, Memory, MemoryFilter, MemorySort, ReactionEmoji } from "@/types/memory";
import { cn } from "@/lib/utils";
import { EmojiText } from "@/components/ui/EmojiText";

const FILTERS: { id: MemoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photos", label: "Photos" },
  { id: "videos", label: "Videos" },
  { id: "letters", label: "Letters" },
  { id: "time_capsules", label: "Capsules" },
  { id: "locked", label: "Locked" },
  { id: "unlocked", label: "Unlocked" },
  { id: "mine", label: "Mine" },
  { id: "partner", label: "Partner" },
  { id: "favorites", label: "Favorites" },
  { id: "pinned", label: "Pinned" },
];

const REACTIONS: ReactionEmoji[] = ["❤️", "🥹", "😂", "😭", "😍", "🔥"];
const MAX_RENDERED_MEMORIES = 24;
const MAX_RENDERED_ACTIVITIES = 24;
const MAX_RENDERED_MOBILE_MEMORIES = 10;
const MAX_RENDERED_MOBILE_ACTIVITIES = 10;

type ShelfView = "memories" | "activity";

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

function isCompactViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function useCompactViewport() {
  const [compact, setCompact] = useState(isCompactViewport);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return compact;
}

function activityLabel(activity: ActivityLog) {
  const actor = activity.actor?.display_name ?? "Someone";
  const title = (activity.metadata?.title as string | undefined) || activity.memory?.title || "a memory";
  const labels: Record<ActivityLog["type"], string> = {
    memory_created: `${actor} created ${title}`,
    memory_edited: `${actor} edited ${title}`,
    memory_deleted: `${actor} deleted ${title}`,
    memory_restored: `${actor} restored ${title}`,
    favorite_added: `${actor} favorited ${title}`,
    favorite_removed: `${actor} removed a favorite from ${title}`,
    reaction_added: `${actor} reacted to ${title}`,
    reaction_changed: `${actor} changed a reaction on ${title}`,
    comment_added: `${actor} commented on ${title}`,
    comment_edited: `${actor} edited a comment on ${title}`,
    comment_deleted: `${actor} deleted a comment on ${title}`,
    time_capsule_locked: `${actor} locked ${title} as a time capsule`,
    time_capsule_unlocked: `${title} opened`,
  };
  return labels[activity.type];
}

function isPendingTimeCapsule(memory: Memory) {
  if (!memory.unlock_at) return false;

  const unlockAtMs = new Date(memory.unlock_at).getTime();
  return Number.isFinite(unlockAtMs) && Date.now() < unlockAtMs;
}

function lockedUntilLabel(unlockAt: string | null) {
  if (!unlockAt) return "Locked time capsule";

  const date = new Date(unlockAt);
  if (!Number.isFinite(date.getTime())) return "Locked time capsule";

  return `Opens ${format(date, "MMM d")}`;
}

function MemoryPreviewThumb({ memory }: { memory: Memory }) {
  const thumbnail = memory.attachments?.find((attachment) => attachment.file_type === "thumbnail")
    ?? memory.attachments?.find((attachment) => attachment.file_type === "photo");
  const { data: url } = useQuery({
    queryKey: ["signedAttachmentUrl", thumbnail?.id, thumbnail?.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(thumbnail!.file_type, thumbnail!.url),
    staleTime: 1000 * 60 * 30,
    enabled: !!thumbnail && (memory.type === "video" || memory.type === "photo"),
  });

  if (!url) return null;

  return (
    <span className="mr-3 hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-black/20 sm:block">
      <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
    </span>
  );
}

interface MemoryCommandCenterProps {
  className?: string;
}

export function MemoryCommandCenter({ className }: MemoryCommandCenterProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { openViewer } = useMemoryViewer();
  const { removeMemory } = usePhysics();
  const reduceMotion = useReducedMotion();
  const isCompact = useCompactViewport();
  const useSimpleMotion = reduceMotion || isCompact;
  const [isOpen, setIsOpen] = useState(true);
  const [activeView, setActiveView] = useState<ShelfView>("memories");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [sort, setSort] = useState<MemorySort>("newest");
  const [pendingDeleted, setPendingDeleted] = useState<Set<string>>(new Set());
  const deleteTimers = useRef<Map<string, number>>(new Map());

  const { data: memories = [], isLoading } = useMemories({ search: debouncedSearch, filter, sort });
  const { data: activities = [] } = useActivityFeed();

  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      for (const timeout of timers.values()) window.clearTimeout(timeout);
      timers.clear();
    };
  }, []);

  const visibleMemories = useMemo(
    () => memories.filter((memory) => !pendingDeleted.has(memory.id)),
    [memories, pendingDeleted],
  );
  const renderedMemories = useMemo(
    () => visibleMemories.slice(0, isCompact ? MAX_RENDERED_MOBILE_MEMORIES : MAX_RENDERED_MEMORIES),
    [isCompact, visibleMemories],
  );
  const renderedActivities = useMemo(
    () => activities.slice(0, isCompact ? MAX_RENDERED_MOBILE_ACTIVITIES : MAX_RENDERED_ACTIVITIES),
    [activities, isCompact],
  );

  const favoriteMutation = useMutation({
    mutationFn: ({ memory, favorite }: { memory: Memory; favorite: boolean }) => memoryService.setFavorite(memory.id, favorite),
    onMutate: async ({ memory, favorite }) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });
      const previousMemories = queryClient.getQueriesData<Memory[]>({ queryKey: ["memories"] });
      queryClient.setQueriesData<Memory[]>({ queryKey: ["memories"] }, (old) =>
        old?.map((item) =>
          item.id === memory.id
            ? { ...item, is_favorite: favorite, favorite_count: Math.max(0, (item.favorite_count ?? 0) + (favorite ? 1 : -1)) }
            : item,
        ),
      );
      return { previousMemories };
    },
    onError: (error, _variables, context) => {
      context?.previousMemories.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(`Favorite failed: ${error instanceof Error ? error.message : String(error)}`);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory", variables.memory.id] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ memory, pinned }: { memory: Memory; pinned: boolean }) => memoryService.setPinned(memory.id, pinned),
    onMutate: async ({ memory, pinned }) => {
      queryClient.setQueriesData<Memory[]>({ queryKey: ["memories"] }, (old) =>
        old?.map((item) => item.id === memory.id ? { ...item, is_pinned: pinned, pinned_at: pinned ? new Date().toISOString() : null } : item),
      );
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory", variables.memory.id] });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: ({ memory, emoji }: { memory: Memory; emoji: ReactionEmoji }) => memoryService.setReaction(memory.id, emoji),
    onMutate: async ({ memory, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });
      const previousMemories = queryClient.getQueriesData<Memory[]>({ queryKey: ["memories"] });
      queryClient.setQueriesData<Memory[]>({ queryKey: ["memories"] }, (old) =>
        old?.map((item) => {
          if (item.id !== memory.id) return item;
          const previousEmoji = item.my_reaction;
          const counts = { ...(item.reaction_counts ?? {}) } as Record<ReactionEmoji, number>;
          if (previousEmoji) counts[previousEmoji] = Math.max(0, (counts[previousEmoji] ?? 0) - 1);
          counts[emoji] = (counts[emoji] ?? 0) + 1;
          return { ...item, my_reaction: emoji, reaction_counts: counts };
        }),
      );
      return { previousMemories };
    },
    onError: (error, _variables, context) => {
      context?.previousMemories.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(`Reaction failed: ${error instanceof Error ? error.message : String(error)}`);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory", variables.memory.id] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });

  const scheduleDelete = (memory: Memory) => {
    if (deleteTimers.current.has(memory.id)) return;

    setPendingDeleted((current) => new Set(current).add(memory.id));

    const timeout = window.setTimeout(async () => {
      deleteTimers.current.delete(memory.id);
      try {
        await memoryService.deleteMemory(memory.id);
        removeMemory(memory.id);
        queryClient.removeQueries({ queryKey: ["memory", memory.id] });
        queryClient.invalidateQueries({ queryKey: ["memories"] });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      } catch (error) {
        setPendingDeleted((current) => {
          const next = new Set(current);
          next.delete(memory.id);
          return next;
        });
        toast.error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 10000);

    deleteTimers.current.set(memory.id, timeout);
    toast("Memory moved to trash", {
      description: "Undo is available for 10 seconds.",
      action: {
        label: "Undo",
        onClick: () => {
          const timer = deleteTimers.current.get(memory.id);
          if (timer) window.clearTimeout(timer);
          deleteTimers.current.delete(memory.id);
          setPendingDeleted((current) => {
            const next = new Set(current);
            next.delete(memory.id);
            return next;
          });
        },
      },
      duration: 10000,
    });
  };

  return (
    <div className={cn("mt-7 w-full max-w-[min(100%,42rem)] xl:mt-0 xl:max-w-none", className)}>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="memory-shelf-reopen"
            initial={{ opacity: 0, x: -22, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.96 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsOpen(true)}
            className="hidden xl:inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2 text-sm text-zinc-300 shadow-2xl backdrop-blur-xl"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Memories
          </motion.button>
        ) : (
          <motion.section
            key="memory-shelf-panel"
            initial={{ opacity: 0, x: -28, scale: 0.985, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -28, scale: 0.985, filter: "blur(8px)" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.12] bg-zinc-950/[0.9] shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:bg-zinc-950/[0.74] xl:bg-zinc-950/[0.38]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_36%)]" />

            <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4">
              <div>
                <p className="font-cormorant text-[1.75rem] leading-none text-zinc-100 sm:text-xl">Memory Shelf</p>
                <p className="mt-1 text-[11px] text-zinc-400">{visibleMemories.length} shown</p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/trash"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Trash
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] text-zinc-400 transition-colors hover:text-zinc-100 xl:inline-flex"
                  aria-label="Close memory shelf"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative p-4">
              <div className="grid grid-cols-2 rounded-[1rem] border border-white/[0.1] bg-black/35 p-1">
                {[
                  { id: "memories" as const, label: "Memories", icon: BookOpen },
                  { id: "activity" as const, label: "Activity", icon: Flame },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={cn(
                        "relative h-10 rounded-[0.9rem] text-sm transition-colors",
                        selected ? "text-white" : "text-zinc-300 hover:text-zinc-100",
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="memory-shelf-tab"
                          className="absolute inset-0 rounded-full bg-emerald-600/90 shadow-lg shadow-emerald-950/30"
                          transition={{ type: "spring", stiffness: 330, damping: 30 }}
                        />
                      )}
                      <span className="relative inline-flex items-center gap-1.5">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {activeView === "memories" ? (
                  <motion.div
                    key="memory-shelf-memories"
                    initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-3 sm:mt-4"
                  >
                    <div className="flex gap-2">
                      <label className="relative min-w-0 flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search"
                          className="h-11 w-full rounded-full border border-white/[0.1] bg-black/35 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15"
                        />
                      </label>
                      <button
                        onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
                        className="h-11 rounded-full border border-white/[0.1] bg-white/[0.08] px-3 text-xs text-zinc-200 transition hover:text-zinc-100"
                      >
                        {sort === "newest" ? "Newest" : "Oldest"}
                      </button>
                    </div>

                    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                      {FILTERS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilter(item.id)}
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors",
                            filter === item.id
                              ? "bg-emerald-500/95 text-white"
                              : "bg-white/[0.08] text-zinc-300 hover:bg-white/[0.12] hover:text-zinc-100",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] sm:mt-4 sm:max-h-[52vh]">
                      {isLoading && <div className="px-2 py-8 text-center text-sm text-zinc-500">Searching the jar...</div>}
                      {!isLoading && visibleMemories.length === 0 && (
                        <div className="px-2 py-8 text-center text-sm text-zinc-500">No memories match this view.</div>
                      )}

                      <AnimatePresence initial={false}>
                        {renderedMemories.map((memory) => {
                          const isLockedCapsule = isPendingTimeCapsule(memory);
                          const title = memory.title || "Untitled memory";
                          const preview = memory.content || memory.tags?.map((tag) => `#${tag.name}`).join(" ") || "Open to preview this memory.";

                          return (
                            <motion.article
                              key={memory.id}
                              layout={!useSimpleMotion}
                              initial={useSimpleMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                              animate={useSimpleMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                              exit={useSimpleMotion ? { opacity: 0 } : { opacity: 0, x: -16, scale: 0.98 }}
                              transition={{ duration: useSimpleMotion ? 0.12 : 0.22 }}
                              className={cn(
                                "group rounded-xl border border-white/[0.1] bg-zinc-900/75 p-3 transition-colors hover:bg-zinc-900/90 sm:rounded-2xl sm:bg-white/[0.055]",
                                isLockedCapsule && "border-emerald-400/15 bg-emerald-950/[0.08]",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <button onClick={() => openViewer(memory.id)} className="flex min-w-0 flex-1 text-left">
                                  <MemoryPreviewThumb memory={memory} />
                                  <span className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                    {memory.is_pinned && <Pin className="h-3 w-3 text-emerald-400" />}
                                    <span>{memory.type.replace("_", " ")}</span>
                                    {memory.unlock_at && <span className="normal-case tracking-normal text-zinc-600">Capsule</span>}
                                  </div>
                                  <h3 className="truncate font-cormorant text-xl leading-tight text-zinc-100">
                                    {isLockedCapsule ? (
                                      <span className="relative block">
                                        <span className="block truncate select-none blur-md opacity-15 text-transparent">
                                          <EmojiText text={title} />
                                        </span>
                                        <span className="absolute inset-0 flex items-center gap-1.5 text-zinc-100">
                                          <Lock className="h-3.5 w-3.5 text-emerald-300" />
                                          Locked time capsule
                                        </span>
                                      </span>
                                    ) : (
                                      <EmojiText text={title} />
                                    )}
                                  </h3>
                                  <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                                    {isLockedCapsule ? (
                                      <span className="relative block">
                                        <span className="block truncate select-none blur-md opacity-15 text-transparent">
                                          <EmojiText text={preview} />
                                        </span>
                                        <span className="absolute inset-0 text-emerald-300/70">
                                          {lockedUntilLabel(memory.unlock_at)}
                                        </span>
                                      </span>
                                    ) : (
                                      <EmojiText text={preview} />
                                    )}
                                  </p>
                                  </span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => favoriteMutation.mutate({ memory, favorite: !memory.is_favorite })}
                                    disabled={favoriteMutation.isPending}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-zinc-100 active:scale-95 disabled:opacity-50"
                                    aria-label={memory.is_favorite ? "Remove favorite" : "Favorite memory"}
                                  >
                                    <Star className={cn("h-4 w-4", memory.is_favorite && "fill-amber-400 text-amber-400")} />
                                  </button>
                                  {profile?.id === memory.created_by && (
                                    <button
                                      onClick={() => pinMutation.mutate({ memory, pinned: !memory.is_pinned })}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-zinc-100 active:scale-95"
                                      aria-label={memory.is_pinned ? "Unpin memory" : "Pin memory"}
                                    >
                                      {memory.is_pinned ? <PinOff className="h-4 w-4 text-emerald-400" /> : <Pin className="h-4 w-4" />}
                                    </button>
                                  )}
                                  {profile?.id === memory.created_by && (
                                    <button
                                      onClick={() => scheduleDelete(memory)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500 transition-colors hover:bg-rose-500/10 active:scale-95"
                                      aria-label="Delete memory"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex max-w-[calc(100%-4rem)] gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                  {REACTIONS.map((emoji) => (
                                    <motion.button
                                      key={emoji}
                                      whileTap={{ scale: 0.86 }}
                                      onClick={() => reactionMutation.mutate({ memory, emoji })}
                                      className={cn(
                                        "h-8 min-w-8 shrink-0 rounded-full border border-white/[0.1] bg-black/35 px-2 text-xs text-zinc-100",
                                        memory.my_reaction === emoji && "border-rose-400/40 bg-rose-400/10",
                                      )}
                                    >
                                      <EmojiText text={emoji} /> {memory.reaction_counts?.[emoji] ? memory.reaction_counts[emoji] : ""}
                                    </motion.button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{memory.favorite_count ?? 0}</span>
                                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{memory.comment_count ?? 0}</span>
                                </div>
                              </div>
                            </motion.article>
                          );
                        })}
                      </AnimatePresence>
                      {visibleMemories.length > renderedMemories.length && (
                        <div className="px-2 py-3 text-center text-xs text-zinc-600">
                          Showing {renderedMemories.length} of {visibleMemories.length}. Search or filter to narrow the shelf.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="memory-shelf-activity"
                    initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                    transition={{ duration: useSimpleMotion ? 0.14 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] sm:mt-4"
                  >
                    {renderedActivities.map((activity) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-3 text-sm text-zinc-400"
                      >
                        <div className="flex gap-3">
                          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                            <Flame className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-zinc-300"><EmojiText text={activityLabel(activity)} /></p>
                            <p className="mt-1 text-xs text-zinc-600">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {activities.length > renderedActivities.length && (
                      <div className="px-2 py-3 text-center text-xs text-zinc-600">
                        Showing latest {renderedActivities.length} activity items.
                      </div>
                    )}
                    {renderedActivities.length === 0 && (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-8 text-center text-sm text-zinc-500">
                        No activity yet.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="mt-3 hidden items-center gap-1 text-xs text-zinc-600 transition-colors hover:text-zinc-300 xl:inline-flex"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Hide shelf
        </button>
      )}
    </div>
  );
}
