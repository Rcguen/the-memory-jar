"use client";

import { useEffect, useState } from "react";
import { useMemories } from "@/hooks/useMemoryData";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { formatDistanceToNow } from "date-fns";
import { memoryService } from "@/services/memory";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContinueReadingCard({ className }: { className?: string }) {
  const { data: memories = [] } = useMemories({});
  const { openViewer } = useMemoryViewer();
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);
  const [lastOpenedAt, setLastOpenedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("lastOpenedMemoryId");
      const at = localStorage.getItem("lastOpenedAt");
      if (id) setLastOpenedId(id);
      if (at) setLastOpenedAt(parseInt(at, 10));
    }
  }, []);

  const memory = memories.find((m) => m.id === lastOpenedId);

  // Use the same thumbnail logic as MemoryCommandCenter
  const thumbnail = memory?.attachments?.find((a) => a.file_type === "thumbnail")
    ?? memory?.attachments?.find((a) => a.file_type === "photo");

  const { data: url } = useQuery({
    queryKey: ["attachmentUrl", thumbnail?.id, thumbnail?.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(thumbnail!.file_type, thumbnail!.url),
    staleTime: 1000 * 60 * 30,
    enabled: !!thumbnail && (memory?.type === "video" || memory?.type === "photo"),
  });

  if (!memory || !lastOpenedId) return null;

  const getActionText = (type: string) => {
    switch (type) {
      case "letter": return "Continue Reading";
      case "voice": return "Continue Listening";
      case "video": return "Continue Watching";
      case "photo": return "Continue Looking";
      default: return "Continue Waiting"; // For capsules etc.
    }
  };

  const actionText = getActionText(memory.type);
  const isRecent = lastOpenedAt && (Date.now() - lastOpenedAt) < 1000 * 60 * 60 * 24; // within 24h

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      onClick={() => openViewer(memory.id)}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-zinc-950/60 p-4 shadow-xl backdrop-blur-md text-left transition-colors hover:bg-zinc-900/80",
        className
      )}
    >
      {/* Bookmark Ribbon */}
      <div className={cn(
        "absolute -top-1 right-4 w-4 h-8 rounded-b-sm z-20 shadow-sm transition-colors",
        isRecent ? "bg-rose-500/80" : "bg-[#8a7f6c]/60"
      )}>
        <div className="absolute -bottom-2 left-0 right-0 border-solid border-t-[8px] border-x-[8px] border-b-0 border-x-transparent" style={{ borderTopColor: isRecent ? 'rgba(244, 63, 94, 0.8)' : 'rgba(138, 127, 108, 0.6)' }} />
      </div>

      {url && (
        <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30">
          <img src={url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>
      )}
      
      <div className="relative z-10 flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-3">
        <BookOpen className="w-3.5 h-3.5" />
        {actionText}
      </div>
      
      <div className="relative z-10 mt-auto">
        <h3 className="font-cormorant text-xl text-zinc-100 line-clamp-2 leading-tight">
          {memory.title || "Untitled memory"}
        </h3>
        {lastOpenedAt && (
          <p className="mt-1.5 text-xs text-zinc-400">
            Opened {formatDistanceToNow(lastOpenedAt, { addSuffix: true })}
          </p>
        )}
      </div>
    </motion.button>
  );
}
