"use client";

import { useMemories } from "@/hooks/useMemoryData";
import { Camera, Heart, Mail, Mic } from "lucide-react";

export function LittleMoments() {
  const { data: memories = [] } = useMemories({});
  
  const stats = {
    letters: memories.filter(m => m.type === "letter").length,
    photos: memories.filter(m => m.type === "photo").length,
    voice: memories.filter(m => m.type === "voice").length,
    favorites: memories.filter(m => m.is_favorite).length,
  };

  if (memories.length === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-[var(--divider)] px-2 pt-3 text-[color:var(--text-tertiary)]">
      <div className="flex items-center gap-1.5" title="Letters">
        <Mail className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{stats.letters}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Photos">
        <Camera className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{stats.photos}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Voice Notes">
        <Mic className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{stats.voice}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Favorites">
        <Heart className="w-3.5 h-3.5 text-rose-400/70" />
        <span className="text-xs font-medium">{stats.favorites}</span>
      </div>
    </div>
  );
}
