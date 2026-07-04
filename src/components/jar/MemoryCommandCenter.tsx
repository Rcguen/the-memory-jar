"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  ChevronLeft,
  Flame,
  Heart,
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

type ShelfView = "memories" | "activity";

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
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

interface MemoryCommandCenterProps {
  className?: string;
}

export function MemoryCommandCenter({ className }: MemoryCommandCenterProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { openViewer } = useMemoryViewer();
  const { removeMemory } = usePhysics();
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
    () => visibleMemories.slice(0, MAX_RENDERED_MEMORIES),
    [visibleMemories],
  );
  const renderedActivities = useMemo(
    () => activities.slice(0, MAX_RENDERED_ACTIVITIES),
    [activities],
  );

  const favoriteMutation = useMutation({
    mutationFn: ({ memory, favorite }: { memory: Memory; favorite: boolean }) => memoryService.setFavorite(memory.id, favorite),
    onMutate: async ({ memory, favorite }) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });
      queryClient.setQueriesData<Memory[]>({ queryKey: ["memories"] }, (old) =>
        old?.map((item) =>
          item.id === memory.id
            ? { ...item, is_favorite: favorite, favorite_count: Math.max(0, (item.favorite_count ?? 0) + (favorite ? 1 : -1)) }
            : item,
        ),
      );
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
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory", variables.memory.id] });
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
    <div className={cn("mt-8 w-full max-w-3xl xl:mt-0 xl:max-w-none", className)}>
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
            className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-zinc-950/[0.34] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_36%)]" />

            <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div>
                <p className="font-cormorant text-xl text-zinc-100">Memory Shelf</p>
                <p className="text-[11px] text-zinc-500">{visibleMemories.length} shown</p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/trash"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
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
              <div className="grid grid-cols-2 rounded-full border border-white/[0.07] bg-black/20 p-1">
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
                        "relative h-9 rounded-full text-sm transition-colors",
                        selected ? "text-white" : "text-zinc-500 hover:text-zinc-300",
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
                    className="mt-4"
                  >
                    <div className="flex gap-2">
                      <label className="relative min-w-0 flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search"
                          className="h-10 w-full rounded-full border border-white/[0.07] bg-black/20 pl-9 pr-3 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
                        />
                      </label>
                      <button
                        onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
                        className="h-10 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 text-xs text-zinc-400 transition hover:text-zinc-100"
                      >
                        {sort === "newest" ? "Newest" : "Oldest"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {FILTERS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilter(item.id)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                            filter === item.id
                              ? "bg-emerald-500/95 text-white"
                              : "bg-white/[0.05] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
                      {isLoading && <div className="px-2 py-8 text-center text-sm text-zinc-500">Searching the jar...</div>}
                      {!isLoading && visibleMemories.length === 0 && (
                        <div className="px-2 py-8 text-center text-sm text-zinc-500">No memories match this view.</div>
                      )}

                      <AnimatePresence initial={false}>
                        {renderedMemories.map((memory) => (
                          <motion.article
                            key={memory.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -16, scale: 0.98 }}
                            transition={{ duration: 0.22 }}
                            className="group rounded-2xl border border-white/[0.07] bg-white/[0.045] p-3 transition-colors hover:bg-white/[0.07]"
                          >
                            <div className="flex items-start gap-3">
                              <button onClick={() => openViewer(memory.id)} className="min-w-0 flex-1 text-left">
                                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                  {memory.is_pinned && <Pin className="h-3 w-3 text-emerald-400" />}
                                  <span>{memory.type.replace("_", " ")}</span>
                                  {memory.unlock_at && <span className="normal-case tracking-normal text-zinc-600">Capsule</span>}
                                </div>
                                <h3 className="truncate font-cormorant text-xl leading-tight text-zinc-100">
                                  {memory.title || "Untitled memory"}
                                </h3>
                                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                                  {memory.content || memory.tags?.map((tag) => `#${tag.name}`).join(" ") || "Open to preview this memory."}
                                </p>
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => favoriteMutation.mutate({ memory, favorite: !memory.is_favorite })}
                                  className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
                                  aria-label={memory.is_favorite ? "Remove favorite" : "Favorite memory"}
                                >
                                  <Star className={cn("h-4 w-4", memory.is_favorite && "fill-amber-400 text-amber-400")} />
                                </button>
                                {profile?.id === memory.created_by && (
                                  <button
                                    onClick={() => pinMutation.mutate({ memory, pinned: !memory.is_pinned })}
                                    className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
                                    aria-label={memory.is_pinned ? "Unpin memory" : "Pin memory"}
                                  >
                                    {memory.is_pinned ? <PinOff className="h-4 w-4 text-emerald-400" /> : <Pin className="h-4 w-4" />}
                                  </button>
                                )}
                                {profile?.id === memory.created_by && (
                                  <button
                                    onClick={() => scheduleDelete(memory)}
                                    className="rounded-full p-1.5 text-rose-500 transition-colors hover:bg-rose-500/10"
                                    aria-label="Delete memory"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex max-w-[70%] gap-1 overflow-hidden">
                                {REACTIONS.map((emoji) => (
                                  <motion.button
                                    key={emoji}
                                    whileTap={{ scale: 0.86 }}
                                    onClick={() => reactionMutation.mutate({ memory, emoji })}
                                    className={cn(
                                      "h-7 min-w-7 rounded-full border border-white/[0.07] bg-black/20 px-2 text-xs",
                                      memory.my_reaction === emoji && "border-rose-400/40 bg-rose-400/10",
                                    )}
                                  >
                                    {emoji} {memory.reaction_counts?.[emoji] ? memory.reaction_counts[emoji] : ""}
                                  </motion.button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{memory.favorite_count ?? 0}</span>
                                <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{memory.comment_count ?? 0}</span>
                              </div>
                            </div>
                          </motion.article>
                        ))}
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
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-4 max-h-[58vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]"
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
                            <p className="text-zinc-300">{activityLabel(activity)}</p>
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
