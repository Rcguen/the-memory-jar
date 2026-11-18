"use client";

import { useEffect, useMemo, useState } from "react";
import { useHomeMemories } from "@/hooks/useMemoryData";
import { getHomePreview, usePrivateThumbnail } from "@/hooks/usePrivateThumbnail";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { getMemoryOfTheDay } from "@/lib/memory-score";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { motion } from "framer-motion";
import { ArrowRight, CalendarHeart } from "lucide-react";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { EmojiText } from "@/components/ui/EmojiText";

export function MemoryOfTheDay() {
  const { data: memories = [] } = useHomeMemories();
  const { data: relationshipContext } = useRelationshipContext();
  const { openViewer } = useMemoryViewer();
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastOpenedId(localStorage.getItem("lastOpenedMemoryId"));
    }
  }, []);

  const memory = useMemo(() => getMemoryOfTheDay(memories, relationshipContext?.relationshipTimezone || "UTC", lastOpenedId), [memories, relationshipContext?.relationshipTimezone, lastOpenedId]);
  const previewSource = memory ? getHomePreview(memory) : null;
  const { containerRef, url, retryImage } = usePrivateThumbnail(previewSource);
  if (!memory) return null;

  return (
    <div className="mb-6 flex flex-col">
      <h3 className="mb-3 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wide text-[var(--text-muted)]"><CalendarHeart className="h-3.5 w-3.5 text-[var(--accent-rose)]" />Memory of the day</h3>
      <motion.button onClick={() => openViewer(memory.id)} aria-label={`Open memory: ${memory.title || "A quiet moment"}`} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }} className="surface-ink group relative flex overflow-hidden rounded-2xl p-4 text-left transition-colors hover:border-[var(--accent-rose)] sm:p-5">
        {previewSource && <div ref={containerRef} className="relative mr-4 h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] sm:h-32 sm:w-28">{url && <img src={url} alt="" className="h-full w-full scale-110 object-cover opacity-80 blur-[16px] transition-[filter,transform,opacity] duration-500 group-hover:scale-100 group-hover:blur-none group-hover:opacity-100" loading="lazy" decoding="async" onError={retryImage} />}{url && <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/20 text-[10px] font-medium text-white/90 transition-opacity duration-300 group-hover:opacity-0"><Eye className="h-4 w-4" aria-hidden="true" />Hover to reveal</span>}</div>}
        <div className="flex min-w-0 flex-1 flex-col justify-center"><p className="mb-1 text-[10px] text-[var(--text-muted)]">{format(new Date(memory.memory_date || memory.created_at), "MMMM d, yyyy")}</p><h4 className="mb-2 line-clamp-1 font-cormorant text-2xl leading-tight text-[var(--text-strong)] sm:text-3xl"><EmojiText text={memory.title || "A quiet moment"} /></h4><p className="line-clamp-2 pr-2 text-sm italic leading-relaxed text-[var(--text-muted)]"><EmojiText text={memory.content || "An image kept safely in the jar..."} /></p><div className="mt-3 flex items-center gap-1 text-[11px] font-medium tracking-wide text-[var(--accent-rose)] opacity-80 transition-opacity group-hover:opacity-100">Open again <ArrowRight className="h-3 w-3" /></div></div>
      </motion.button>
    </div>
  );
}
