"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useDeletedMemories } from "@/hooks/useMemoryData";
import { usePhysics } from "@/providers/physics-provider";
import { memoryService } from "@/services/memory";
import { Memory } from "@/types/memory";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { removeMemory } = usePhysics();
  const { data: memories = [], isLoading } = useDeletedMemories();
  const [preview, setPreview] = useState<Memory | null>(null);
  const [confirming, setConfirming] = useState<Memory | null>(null);

  const restoreMutation = useMutation({
    mutationFn: (memory: Memory) => memoryService.restoreMemory(memory.id),
    onSuccess: (_, memory) => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      queryClient.invalidateQueries({ queryKey: ['memory', memory.id] });
      toast.success("Memory restored.");
    },
  });

  const purgeMutation = useMutation({
    mutationFn: (memory: Memory) => memoryService.permanentlyDeleteMemory(memory.id),
    onSuccess: (_, memory) => {
      removeMemory(memory.id);
      queryClient.removeQueries({ queryKey: ['memory', memory.id] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setConfirming(null);
      setPreview(null);
      toast.success("Memory permanently deleted.");
    },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-emerald-50/30 dark:bg-emerald-950/20 px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-100/40 via-emerald-50/20 to-transparent dark:from-teal-900/20 dark:via-emerald-950/30 dark:to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to jar
        </Link>

        <section className="rounded-2xl border border-white/50 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-black/5 dark:border-white/10">
            <h1 className="font-cormorant text-4xl text-zinc-800 dark:text-zinc-100">Trash</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Deleted memories can be restored or permanently removed.</p>
          </div>

          <div className="p-4 grid md:grid-cols-[1fr_20rem] gap-4">
            <div className="space-y-2">
              {isLoading && <p className="p-4 text-sm text-zinc-500">Opening the trash...</p>}
              {!isLoading && memories.length === 0 && <p className="p-4 text-sm text-zinc-500">Trash is empty.</p>}
              <AnimatePresence initial={false}>
                {memories.map((memory) => (
                  <motion.article
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-white/50 dark:border-zinc-800/60 p-4 flex gap-3"
                  >
                    <button onClick={() => setPreview(memory)} className="min-w-0 flex-1 text-left">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">{memory.type.replace("_", " ")}</p>
                      <h2 className="font-cormorant text-2xl text-zinc-800 dark:text-zinc-100 truncate">{memory.title || "Untitled memory"}</h2>
                      <p className="text-xs text-zinc-500 line-clamp-1">
                        Deleted {memory.deleted_at ? formatDistanceToNow(new Date(memory.deleted_at), { addSuffix: true }) : "recently"}
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreMutation.mutate(memory)}
                        className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        aria-label="Restore memory"
                      >
                        <RotateCcw className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => setConfirming(memory)}
                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label="Permanently delete memory"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>

            <aside className="rounded-xl bg-white/45 dark:bg-zinc-900/45 border border-white/50 dark:border-zinc-800/60 p-4 min-h-52">
              {preview ? (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-cormorant text-2xl text-zinc-800 dark:text-zinc-100">{preview.title || "Untitled memory"}</h2>
                    <button onClick={() => setPreview(null)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-[10]">
                    {preview.content || "No text preview."}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Select a deleted memory to preview it.</p>
              )}
            </aside>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-950 border border-white/50 dark:border-zinc-800 p-5 shadow-2xl"
            >
              <h2 className="font-cormorant text-2xl text-zinc-900 dark:text-zinc-100">Delete forever?</h2>
              <p className="text-sm text-zinc-500 mt-2">This removes the memory, attachments, and storage objects permanently.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setConfirming(null)} className="px-4 py-2 rounded-full text-sm bg-zinc-100 dark:bg-zinc-800">
                  Cancel
                </button>
                <button
                  onClick={() => purgeMutation.mutate(confirming)}
                  disabled={purgeMutation.isPending}
                  className="px-4 py-2 rounded-full text-sm bg-rose-600 text-white disabled:opacity-50"
                >
                  {purgeMutation.isPending ? "Deleting..." : "Delete forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
