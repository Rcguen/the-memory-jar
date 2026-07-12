"use client";

import { useMemo, useState } from "react";
import { useMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiText } from "@/components/ui/EmojiText";

function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function TodaysLetter({ className }: { className?: string }) {
  const { data: memories = [] } = useMemories({});
  const { data: relationshipContext } = useRelationshipContext();
  const { openViewer } = useMemoryViewer();
  const [nowTimestamp] = useState(() => Date.now());

  const letter = useMemo(() => {
    const letters = memories.filter(m => 
      m.type === "letter" && 
      !m.deleted_at && 
      m.status !== "draft" && 
      m.status !== "pending_partner" &&
      (!m.unlock_at || new Date(m.unlock_at).getTime() <= nowTimestamp) &&
      m.content
    );

    if (letters.length === 0) return null;

    const tz = relationshipContext?.relationshipTimezone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const dateStr = formatter.format(new Date()); // YYYY-MM-DD
    const seed = parseInt(dateStr.replace(/-/g, ""), 10);
    
    // Pick a stable index for the day
    const index = Math.floor(seededRandom(seed) * letters.length);
    return letters[index];
  }, [memories, relationshipContext?.relationshipTimezone, nowTimestamp]);

  if (!letter) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      onClick={() => openViewer(letter.id)}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[1.35rem] border border-[#d2c9b6]/30 bg-[#FDFBF7] p-4 shadow-[2px_3px_10px_rgba(0,0,0,0.15)] text-left transition-all hover:shadow-[4px_6px_15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5",
        "after:absolute after:inset-0 after:rounded-[1.35rem] after:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      <div className="relative z-10 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8a7f6c] font-semibold mb-3">
        <Mail className="w-3.5 h-3.5" />
        Today&apos;s Letter
      </div>
      
      <div className="relative z-10">
        <p className="font-cormorant text-lg sm:text-xl text-[#4A453B] line-clamp-2 leading-relaxed mb-2">
          <EmojiText text={letter.content || ""} />
        </p>
        
        {/* Fade out effect */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FDFBF7] to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#d28b76] font-medium opacity-80 group-hover:opacity-100 transition-opacity">
        Continue Reading <ArrowRight className="w-3 h-3" />
      </div>
    </motion.button>
  );
}


