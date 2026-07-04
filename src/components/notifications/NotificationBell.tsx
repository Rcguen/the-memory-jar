"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotifications, useUnreadNotificationCount } from "@/hooks/useMemoryData";
import { memoryService } from "@/services/memory";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { openViewer } = useMemoryViewer();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => memoryService.markNotificationRead(id),
    onMutate: async (id) => {
      queryClient.setQueryData(["notifications"], notifications.map((item) =>
        item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item,
      ));
      queryClient.setQueryData(["unread-notification-count"], Math.max(0, unreadCount - 1));
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
      queryClient.setQueryData(["notifications"], notifications.map((item) => ({ ...item, read_at: item.read_at ?? now })));
      queryClient.setQueryData(["unread-notification-count"], 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/30 text-zinc-600 shadow-sm backdrop-blur-md transition-colors hover:text-zinc-900 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(6px)" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-3 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 text-zinc-100 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="font-cormorant text-xl">Notifications</p>
                <p className="text-xs text-zinc-500">{unreadCount} unread</p>
              </div>
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={unreadCount === 0 || markAllMutation.isPending}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Read all
              </button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">No notifications yet.</div>
              )}
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.read_at) markReadMutation.mutate(notification.id);
                    if (notification.target_memory_id) {
                      setIsOpen(false);
                      openViewer(notification.target_memory_id);
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.07]",
                    !notification.read_at && "bg-emerald-500/[0.08]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", notification.read_at ? "bg-zinc-700" : "bg-emerald-400")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-100">{notification.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-zinc-400">{notification.body}</span>
                      <span className="mt-1 block text-[11px] text-zinc-600">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
