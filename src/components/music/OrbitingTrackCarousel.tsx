"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useOrbitPhysics } from "@/hooks/useOrbitPhysics";
import type { CSSProperties } from "react";
import type { MusicTrack } from "@/types/music";
import { OrbitingTrackCard } from "./OrbitingTrackCard";

function OrbitMotionController(props: Parameters<typeof useOrbitPhysics>[0]) {
  useOrbitPhysics(props);
  return null;
}

export function OrbitingTrackCarousel({ tracks, selectedIndex, onSelectedIndexChange, paused }: {
  tracks: MusicTrack[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  paused: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const isPhone = useIsPhone();
  const [orbitNode, setOrbitNode] = useState<HTMLDivElement | null>(null);
  const radius = isPhone ? "clamp(140px, 36vw, 150px)" : "var(--music-orbit-radius, 210px)";
  const style = { "--itemCount": tracks.length, "--radius": radius } as CSSProperties;
  const selectStep = (offset: number) => { if (tracks.length > 1) onSelectedIndexChange((selectedIndex + offset + tracks.length) % tracks.length); };
  return (
    <div className="music-orbit-layer" aria-label="Track carousel">
      <div ref={setOrbitNode} className="music-orbit" style={style}>
        {tracks.map((track, index) => <OrbitingTrackCard key={track.id} track={track} index={index} selected={index === selectedIndex} />)}
      </div>
      {orbitNode && <OrbitMotionController orbitNode={orbitNode} itemCount={tracks.length} selectedIndex={selectedIndex} onSelect={onSelectedIndexChange} paused={paused} reduceMotion={Boolean(reducedMotion)} />}
      {tracks.length > 1 && <div className="music-orbit-controls" aria-label="Browse tracks"><button type="button" className="music-orbit-control focus-ring-premium" onClick={() => selectStep(-1)} aria-label="Previous track"><ChevronLeft className="h-4 w-4" /></button><button type="button" className="music-orbit-control focus-ring-premium" onClick={() => selectStep(1)} aria-label="Next track"><ChevronRight className="h-4 w-4" /></button></div>}
    </div>
  );
}