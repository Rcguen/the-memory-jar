"use client";

import { useHomeMemories } from "@/hooks/useMemoryData";
import { getHomePreview, usePrivateThumbnail } from "@/hooks/usePrivateThumbnail";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { motion } from "framer-motion";
import type { Memory } from "@/types/memory";
import { EmojiText } from "@/components/ui/EmojiText";

function ReelThumbnail({ memory, onClick }: { memory: Memory; onClick: () => void }) {
  const previewSource = getHomePreview(memory);
  const { containerRef, url, retryImage } = usePrivateThumbnail(previewSource);

  return (
    <div ref={containerRef} className="h-16 w-16 shrink-0 snap-start sm:h-20 sm:w-20">
      <motion.button
        whileHover={{ y: -4, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="group relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        aria-label={`Open memory: ${memory.title || "Photo"}`}
      >
        {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" onError={retryImage} /> : <span className="absolute inset-0 bg-white/[0.08]" aria-hidden="true" />}
        <div className="absolute inset-0 flex items-end bg-black/10 p-1.5 opacity-0 transition-opacity duration-200 group-hover:bg-black/45 group-hover:opacity-100">
          <span className="text-[9px] font-medium leading-tight text-white drop-shadow-md line-clamp-2"><EmojiText text={memory.title || "Photo"} /></span>
        </div>
      </motion.button>
    </div>
  );
}

export function MemoryReel() {
  const { data: memories = [] } = useHomeMemories();
  const { openViewer } = useMemoryViewer();
  const photos = memories.filter((memory) => memory.type === "photo").slice(0, 8);
  if (photos.length === 0) return null;

  return (
    <div className="mt-4 min-w-0 max-w-full overflow-hidden border-t border-white/[0.05] pt-4">
      <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Memory Reel</p>
      <div className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-4 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((memory) => <ReelThumbnail key={memory.id} memory={memory} onClick={() => openViewer(memory.id)} />)}
      </div>
    </div>
  );
}