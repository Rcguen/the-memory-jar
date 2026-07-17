"use client";

import { useEffect, useState } from "react";
import { useHomeMemories } from "@/hooks/useMemoryData";
import { getHomePreview, usePrivateThumbnail } from "@/hooks/usePrivateThumbnail";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiText } from "@/components/ui/EmojiText";

export function ContinueReadingCard({ className }: { className?: string }) {
  const { data: memories = [] } = useHomeMemories();
  const { openViewer } = useMemoryViewer();
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);
  const [lastOpenedAt, setLastOpenedAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = localStorage.getItem("lastOpenedMemoryId");
      const at = localStorage.getItem("lastOpenedAt");
      setLastOpenedId(id);
      setLastOpenedAt(at ? parseInt(at, 10) : null);
      setCurrentTime(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const memory = memories.find((item) => item.id === lastOpenedId);
  const previewSource = memory ? getHomePreview(memory) : null;
  const { containerRef, url, retryImage } = usePrivateThumbnail(previewSource);
  if (!memory || !lastOpenedId) return null;

  const actionText = memory.type === "letter" ? "Continue Reading" : memory.type === "voice" ? "Continue Listening" : memory.type === "video" ? "Continue Watching" : memory.type === "photo" ? "Continue Looking" : "Continue Waiting";
  const isRecent = lastOpenedAt && currentTime - lastOpenedAt < 1000 * 60 * 60 * 24;

  return (
    <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} onClick={() => openViewer(memory.id)} className={cn("group relative flex flex-col justify-between overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-zinc-950/60 p-4 text-left shadow-xl backdrop-blur-md transition-colors hover:bg-zinc-900/80", className)}>
      <div className={cn("absolute -top-1 right-4 z-20 h-8 w-4 rounded-b-sm shadow-sm transition-colors", isRecent ? "bg-rose-500/80" : "bg-[#8a7f6c]/60")}><div className="absolute -bottom-2 left-0 right-0 border-x-[8px] border-b-0 border-t-[8px] border-solid border-x-transparent" style={{ borderTopColor: isRecent ? "rgba(244, 63, 94, 0.8)" : "rgba(138, 127, 108, 0.6)" }} /></div>
      {previewSource && <div ref={containerRef} className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30">{url && <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" onError={retryImage} />}<div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" /></div>}
      <div className="relative z-10 mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400"><BookOpen className="h-3.5 w-3.5" />{actionText}</div>
      <div className="relative z-10 mt-auto"><h3 className="line-clamp-2 font-cormorant text-xl leading-tight text-zinc-100"><EmojiText text={memory.title || "Untitled memory"} /></h3>{lastOpenedAt && <p className="mt-1.5 text-xs text-zinc-400">Opened {formatDistanceToNow(lastOpenedAt, { addSuffix: true })}</p>}</div>
    </motion.button>
  );
}