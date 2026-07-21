"use client";

import { useHomeMemoryStats, useHomeMemories } from "@/hooks/useMemoryData";
import { Camera, Heart, Mail, Mic } from "lucide-react";

export function LittleMoments() {
  const { data: memories = [] } = useHomeMemories();
  const { data: stats } = useHomeMemoryStats();

  if (memories.length === 0 && !stats) return null;
  return (
    <div className="flex min-w-0 items-center justify-between text-[color:var(--text-tertiary)]">
      <div className="flex items-center gap-1.5" title="Letters">
        <Mail className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{stats?.letters ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Photos">
        <Camera className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{stats?.photos ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Voice Notes">
        <Mic className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{stats?.voice ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Favorites">
        <Heart className="w-3.5 h-3.5 text-rose-400/70" />
        <span className="text-xs font-medium">{stats?.favorites ?? 0}</span>
      </div>
    </div>
  );
}
