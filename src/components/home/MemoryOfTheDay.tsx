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
        className="group relative flex overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-zinc-950/60 p-4 shadow-xl backdrop-blur-md text-left transition-all hover:bg-zinc-900/80 hover:shadow-rose-900/10 hover:border-white/10"
      >
        {url && (
          <div className="w-20 h-24 sm:w-24 sm:h-28 shrink-0 rounded-lg overflow-hidden border border-white/10 mr-4">
            <img src={url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        <div className="flex flex-col flex-1 justify-center min-w-0">
          <p className="text-[10px] text-zinc-400 mb-1">
            {format(new Date(memory.memory_date || memory.created_at), "MMMM d, yyyy")}
          </p>
          <h4 className="font-cormorant text-xl sm:text-2xl text-zinc-100 line-clamp-1 leading-tight mb-2">
            {memory.title || "A quiet moment"}
          </h4>
          <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed italic pr-2">
            {memory.content || "An image kept safely in the jar..."}
          </p>
          
          <div className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-400 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
            Open Again <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </motion.button>
    </div>
  );
}
