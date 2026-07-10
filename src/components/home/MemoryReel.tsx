"use client";

import { useMemories } from "@/hooks/useMemoryData";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { memoryService } from "@/services/memory";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { Memory } from "@/types/memory";

function ReelThumbnail({ memory, onClick }: { memory: Memory, onClick: () => void }) {
  const thumbnail = memory.attachments?.find((a) => a.file_type === "thumbnail")
    ?? memory.attachments?.find((a) => a.file_type === "photo");

  const { data: url } = useQuery({
    queryKey: ["signedAttachmentUrl", thumbnail?.id, thumbnail?.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(thumbnail!.file_type, thumbnail!.url),
    staleTime: 1000 * 60 * 30,
    enabled: !!thumbnail && (memory.type === "video" || memory.type === "photo"),
  });

  if (!url) return null;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border border-white/10 shadow-md cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      aria-label={`Open memory: ${memory.title || "Photo"}`}
    >
      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 group-hover:backdrop-blur-[1px] transition-all duration-300 flex items-end p-1.5 opacity-0 group-hover:opacity-100">
        <span className="text-[9px] text-white font-medium line-clamp-2 leading-tight drop-shadow-md">
          {memory.title || "Photo"}
        </span>
      </div>
    </motion.button>
  );
}

export function MemoryReel() {
  const { data: memories = [] } = useMemories({});
  const { openViewer } = useMemoryViewer();
  
  const photos = memories.filter(m => m.type === "photo").slice(0, 8);

  if (photos.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.05]">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 px-1">Memory Reel</p>
      <div className="flex gap-3 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((memory) => (
          <ReelThumbnail key={memory.id} memory={memory} onClick={() => openViewer(memory.id)} />
        ))}
      </div>
    </div>
  );
}
