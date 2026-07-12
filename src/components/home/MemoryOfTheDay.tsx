"use client";

import { useMemo, useEffect, useState } from "react";
import { useMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { getMemoryOfTheDay } from "@/lib/memory-score";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { memoryService } from "@/services/memory";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarHeart, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { EmojiText } from "@/components/ui/EmojiText";

export function MemoryOfTheDay() {
  const { data: memories = [] } = useMemories({});
  const { data: relationshipContext } = useRelationshipContext();
  const { openViewer } = useMemoryViewer();
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastOpenedId(localStorage.getItem("lastOpenedMemoryId"));
    }
  }, []);

  const memory = useMemo(() => {
    return getMemoryOfTheDay(
      memories, 
      relationshipContext?.relationshipTimezone || "UTC",
      lastOpenedId
    );
  }, [memories, relationshipContext?.relationshipTimezone, lastOpenedId]);

  const thumbnail = memory?.attachments?.find((a) => a.file_type === "thumbnail")
    ?? memory?.attachments?.find((a) => a.file_type === "photo");

  const { data: url } = useQuery({
    queryKey: ["signedAttachmentUrl", thumbnail?.id, thumbnail?.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(thumbnail!.file_type, thumbnail!.url),
    staleTime: 1000 * 60 * 30,
    enabled: !!thumbnail && !!memory && (memory.type === "video" || memory.type === "photo"),
  });

  if (!memory) return null;

  return (
    <div className="flex flex-col mb-6">
      <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center gap-1.5 px-1">
        <CalendarHeart className="w-3.5 h-3.5 text-rose-400/80" />
        Memory of the Day
      </h3>
      
      <motion.button
        onClick={() => openViewer(memory.id)}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex overflow-hidden rounded-[1.55rem] border border-rose-100/15 bg-[linear-gradient(135deg,rgba(61,40,43,0.92),rgba(19,34,30,0.92))] p-4 shadow-[0_22px_68px_rgba(31,17,21,0.32),inset_0_1px_rgba(255,255,255,0.11)] backdrop-blur-md text-left transition-all hover:border-rose-100/25 hover:shadow-[0_28px_78px_rgba(31,17,21,0.42)] sm:p-5"
      >
        {url && (
          <div className="w-24 h-28 sm:w-28 sm:h-32 shrink-0 rounded-lg overflow-hidden border border-white/10 mr-4">
            <img src={url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        <div className="flex flex-col flex-1 justify-center min-w-0">
          <p className="text-[10px] text-zinc-400 mb-1">
            {format(new Date(memory.memory_date || memory.created_at), "MMMM d, yyyy")}
          </p>
          <h4 className="font-cormorant text-2xl sm:text-3xl text-zinc-100 line-clamp-1 leading-tight mb-2">
            <EmojiText text={memory.title || "A quiet moment"} />
          </h4>
          <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed italic pr-2">
            <EmojiText text={memory.content || "An image kept safely in the jar..."} />
          </p>
          
          <div className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-400 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
            Open Again <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </motion.button>
    </div>
  );
}


