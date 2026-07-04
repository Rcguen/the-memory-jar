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
    <section className="relative z-10 border-t border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015] px-6 py-4">
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-3">Comments</h3>
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
            return (
              <motion.div
                key={comment.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl bg-white/50 dark:bg-zinc-950/40 border border-white/40 dark:border-zinc-800/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500 mb-1">
                      {comment.author?.display_name ?? "Someone"} · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="w-full min-h-16 rounded-lg bg-white/70 dark:bg-zinc-900/70 border border-black/10 dark:border-white/10 p-2 text-sm outline-none"
                      />
                    ) : (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
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
          className="min-w-0 flex-1 h-9 rounded-full bg-white/70 dark:bg-zinc-900/70 border border-black/10 dark:border-white/10 px-4 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!content.trim() || createMutation.isPending}
          aria-label="Send comment"
          className="h-9 w-9 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center disabled:opacity-40 transition active:scale-95"
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
