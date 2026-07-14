"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock,
  Gift,
  Heart,
  Inbox,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useUnreadNotificationCount } from "@/hooks/useMemoryData";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { memoryService } from "@/services/memory";
import type { MemoryNotification, NotificationType } from "@/types/memory";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type NotificationPages = InfiniteData<MemoryNotification[], number>;

function getNotificationIcon(type: NotificationType) {
  if (type === "partner_commented") return MessageCircle;
  if (type === "partner_reacted") return Heart;
  if (type === "time_capsule_unlocked") return Gift;
  return Sparkles;
}

function getNotificationTone(type: NotificationType) {
  if (type === "partner_commented") return "text-sky-300 bg-sky-400/10 border-sky-300/15";
  if (type === "partner_reacted") return "text-rose-300 bg-rose-400/10 border-rose-300/15";
  if (type === "time_capsule_unlocked") return "text-amber-300 bg-amber-400/10 border-amber-300/15";
  return "text-emerald-300 bg-emerald-400/10 border-emerald-300/15";
}

function patchPages(
  current: NotificationPages | undefined,
  patcher: (notification: MemoryNotification) => MemoryNotification,
) {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => page.map(patcher)),
  };
}

function ActorMark({ notification }: { notification: MemoryNotification }) {
  const actorName = notification.actor?.display_name || notification.actor?.username || "P";
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-stone-200">
      {actorName.charAt(0).toUpperCase()}
    </span>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { profile } = useAuth();
  const { openViewer } = useMemoryViewer();

  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications", "pages"],
    queryFn: ({ pageParam }) => memoryService.listNotifications(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return pages.reduce((total, page) => total + page.length, 0);
    },
    enabled: Boolean(profile?.id),
    staleTime: 15 * 1000,
  });

  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const notifications = useMemo(
    () => notificationsQuery.data?.pages.flat() ?? [],
    [notificationsQuery.data],
  );

  const visibleUnreadCount = unreadCount;
  const badgeLabel = visibleUnreadCount > 9 ? "9+" : String(visibleUnreadCount);

  const setUnreadCount = (next: number) => {
    queryClient.setQueryData(["unread-notification-count"], Math.max(0, next));
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || bellRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) bellRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const markReadMutation = useMutation({
    mutationFn: (notification: MemoryNotification) => memoryService.markNotificationRead(notification.id),
    onMutate: async (notification) => {
      if (notification.read_at) return;
      const now = new Date().toISOString();
      queryClient.setQueryData<NotificationPages>(["notifications", "pages"], (current) => patchPages(current, (item) => (
        item.id === notification.id ? { ...item, read_at: item.read_at ?? now } : item
      )));
      queryClient.setQueryData(["unread-notification-count"], Math.max(0, visibleUnreadCount - 1));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => memoryService.markAllNotificationsRead(),
    onMutate: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<NotificationPages>(["notifications", "pages"], (current) => patchPages(current, (item) => ({
        ...item,
        read_at: item.read_at ?? now,
      })));
      setUnreadCount(0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const openNotification = async (notification: MemoryNotification) => {
    if (!notification.read_at) {
      await markReadMutation.mutateAsync(notification).catch(() => undefined);
    }

    setIsOpen(false);

    const hasSafeMemoryTarget = Boolean(
      notification.target_memory_id && notification.memory && !notification.memory.deleted_at,
    );

    if (hasSafeMemoryTarget) {
      openViewer(notification.target_memory_id!);
      return;
    }

    router.push("/");
  };

  const panelMotion = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -8, scale: 0.97, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: -8, scale: 0.97, filter: "blur(6px)" },
      };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/30 text-zinc-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white/45 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-95 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-900/45 dark:hover:text-white",
          isOpen && "bg-white/55 text-zinc-950 dark:bg-white/10 dark:text-white",
        )}
        aria-label={`Notifications${visibleUnreadCount > 0 ? `, ${visibleUnreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {visibleUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold leading-none text-white shadow-lg ring-2 ring-[#14231d]">
            {badgeLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
              className="fixed inset-0 z-[190] bg-black/35 sm:hidden"
              aria-hidden="true"
            />
            <motion.div
              {...panelMotion}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              ref={panelRef}
              role="dialog"
              aria-label="Notifications"
              className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[200] max-h-[min(82dvh,38rem)] overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-950/95 text-zinc-100 shadow-2xl backdrop-blur-2xl sm:absolute sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[23rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="font-cormorant text-2xl leading-none">Notifications</p>
                  <p className="mt-1 text-xs text-zinc-500">{visibleUnreadCount} unread</p>
                </div>
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  disabled={visibleUnreadCount === 0 || markAllMutation.isPending}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {markAllMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                  Mark all as read
                </button>
              </div>

              <div className="max-h-[calc(min(82dvh,38rem)-4.25rem)] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
                {notificationsQuery.isLoading && (
                  <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Listening for whispers...
                  </div>
                )}

                {notificationsQuery.isError && (
                  <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-zinc-400">
                    <AlertCircle className="h-5 w-5 text-rose-300" />
                    <span>Could not load notifications.</span>
                    <button
                      type="button"
                      onClick={() => notificationsQuery.refetch()}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-zinc-500">
                    <Inbox className="h-6 w-6 text-zinc-600" />
                    <span>No new whispers in the jar.</span>
                  </div>
                )}

                <motion.div 
                  className="space-y-1.5"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.035 }
                    }
                  }}
                >
                  {notifications.map((notification, i) => {
                    const Icon = getNotificationIcon(notification.type);
                    const isUnread = !notification.read_at;
                    // Cap animation to first 10 visible items to avoid excessive motion
                    const itemVariants = (shouldReduceMotion || i > 10) ? undefined : {
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } }
                    };
                    return (
                      <motion.button
                        variants={itemVariants}
                        key={notification.id}
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70",
                          isUnread
                            ? "border-emerald-300/15 bg-emerald-400/[0.08] hover:bg-emerald-400/[0.12]"
                            : "border-transparent hover:border-white/10 hover:bg-white/[0.06]",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", getNotificationTone(notification.type))}>
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span className="line-clamp-1 flex-1 text-sm font-medium text-zinc-100">{notification.title}</span>
                              {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-300" aria-label="Unread" />}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-zinc-400">{notification.body}</span>
                            <span className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </span>
                          {notification.actor && <ActorMark notification={notification} />}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {notificationsQuery.hasNextPage && (
                  <div className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => notificationsQuery.fetchNextPage()}
                      disabled={notificationsQuery.isFetchingNextPage}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      {notificationsQuery.isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Load more
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
