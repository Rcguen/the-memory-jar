"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { useMemoryComments } from "@/hooks/useMemoryData";
import { memoryService } from "@/services/memory";
import { MemoryComment } from "@/types/memory";

export function MemoryComments({ memoryId }: { memoryId: string }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: comments = [], isLoading } = useMemoryComments(memoryId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comments.length]);

  const createMutation = useMutation({
    mutationFn: (nextContent: string) => memoryService.createComment(memoryId, nextContent),
    onMutate: async (nextContent) => {
      setSubmitError(null);
      await queryClient.cancelQueries({ queryKey: ['memory-comments', memoryId] });
      const previousComments = queryClient.getQueryData<MemoryComment[]>(['memory-comments', memoryId]) ?? [];
      const trimmed = nextContent.trim();
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticComment: MemoryComment = {
        id: optimisticId,
        memory_id: memoryId,
        user_id: profile?.id ?? "pending",
        content: trimmed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: profile ? {
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar: profile.avatar,
        } : null,
      };

      queryClient.setQueryData<MemoryComment[]>(['memory-comments', memoryId], [...previousComments, optimisticComment]);
      setContent("");
      return { previousComments, optimisticId };
    },
    onSuccess: (createdComment, _nextContent, context) => {
      if (createdComment && context?.optimisticId) {
        queryClient.setQueryData<MemoryComment[]>(['memory-comments', memoryId], (current = []) => (
          current.map((comment) => comment.id === context.optimisticId ? createdComment : comment)
        ));
      }
      queryClient.invalidateQueries({ queryKey: ['memory-comments', memoryId] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
    onError: (error, _nextContent, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['memory-comments', memoryId], context.previousComments);
      }
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "Could not add comment.";
      setSubmitError(message);
      toast.error(`Comment failed: ${message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-comments', memoryId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nextContent }: { id: string; nextContent: string }) => memoryService.updateComment(id, nextContent),
    onSuccess: () => {
      setEditingId(null);
      setEditingContent("");
      queryClient.invalidateQueries({ queryKey: ['memory-comments', memoryId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoryService.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-comments', memoryId] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });

  return (
    <section className="relative z-10 border-t border-black/10 bg-zinc-50/80 px-4 py-4 dark:border-white/5 dark:bg-zinc-950/35 sm:px-6">
      <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Comments</h3>
      <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
        {isLoading && (
          <p className="text-xs text-zinc-500">Loading comments...</p>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-zinc-500">No comments yet.</p>
        )}
        <AnimatePresence initial={false}>
          {comments.map((comment) => {
            const isAuthor = profile?.id === comment.user_id;
            const isEditing = editingId === comment.id;
            const authorName = comment.author?.display_name
              ?? comment.author?.username
              ?? (isAuthor ? profile?.display_name : null)
              ?? "Someone";
            return (
              <motion.div
                key={comment.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {authorName} · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="w-full min-h-16 rounded-lg bg-white/70 dark:bg-zinc-900/70 border border-black/10 dark:border-white/10 p-2 text-sm outline-none"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm text-zinc-700 [overflow-wrap:anywhere] dark:text-zinc-300">
                        {comment.content}
                      </p>
                    )}
                  </div>
                  {isAuthor && (
                    <div className="flex gap-1">
                      {isEditing ? (
                        <button
                          onClick={() => updateMutation.mutate({ id: comment.id, nextContent: editingContent })}
                          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditingContent(comment.content);
                          }}
                          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(comment.id)}
                        className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = content.trim();
          if (!trimmed || createMutation.isPending) return;
          createMutation.mutate(trimmed);
        }}
      >
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              const trimmed = content.trim();
              if (trimmed && !createMutation.isPending) createMutation.mutate(trimmed);
            }
          }}
          placeholder="Add a comment"
          disabled={createMutation.isPending}
          className="h-10 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white/95 px-4 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/15 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={!content.trim() || createMutation.isPending}
          aria-label="Send comment"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition active:scale-95 disabled:opacity-40"
        >
          <Send className={createMutation.isPending ? "w-4 h-4 animate-pulse" : "w-4 h-4"} />
        </button>
      </form>
      {submitError && (
        <p className="mt-2 text-xs text-rose-500 dark:text-rose-300">{submitError}</p>
      )}
    </section>
  );
}
