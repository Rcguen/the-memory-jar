"use client";

import { useEffect, useMemo, useState } from "react";
import { useHomeMemories } from "@/hooks/useMemoryData";
import { getHomePreview, usePrivateThumbnail } from "@/hooks/usePrivateThumbnail";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { getMemoryOfTheDay } from "@/lib/memory-score";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { motion } from "framer-motion";
import { ArrowRight, CalendarHeart } from "lucide-react";
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
      <h3 className="mb-3 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-widest text-zinc-500"><CalendarHeart className="h-3.5 w-3.5 text-rose-400/80" />Memory of the Day</h3>
      <motion.button onClick={() => openViewer(memory.id)} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }} className="group relative flex overflow-hidden rounded-[1.55rem] border border-rose-100/15 bg-[linear-gradient(135deg,rgba(61,40,43,0.92),rgba(19,34,30,0.92))] p-4 text-left shadow-[0_22px_68px_rgba(31,17,21,0.32),inset_0_1px_rgba(255,255,255,0.11)] backdrop-blur-md transition-all hover:border-rose-100/25 hover:shadow-[0_28px_78px_rgba(31,17,21,0.42)] sm:p-5">
        {previewSource && <div ref={containerRef} className="mr-4 h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] sm:h-32 sm:w-28">{url && <img src={url} alt="" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" loading="lazy" decoding="async" onError={retryImage} />}</div>}
        <div className="flex min-w-0 flex-1 flex-col justify-center"><p className="mb-1 text-[10px] text-zinc-400">{format(new Date(memory.memory_date || memory.created_at), "MMMM d, yyyy")}</p><h4 className="mb-2 line-clamp-1 font-cormorant text-2xl leading-tight text-zinc-100 sm:text-3xl"><EmojiText text={memory.title || "A quiet moment"} /></h4><p className="line-clamp-2 pr-2 text-sm italic leading-relaxed text-zinc-400"><EmojiText text={memory.content || "An image kept safely in the jar..."} /></p><div className="mt-3 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-emerald-400 opacity-70 transition-opacity group-hover:opacity-100">Open Again <ArrowRight className="h-3 w-3" /></div></div>
      </motion.button>
    </div>
  );
}