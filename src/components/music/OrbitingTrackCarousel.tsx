"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useOrbitPhysics } from "@/hooks/useOrbitPhysics";
import type { MusicTrack } from "@/types/music";
import { OrbitingTrackCard } from "./OrbitingTrackCard";

function OrbitMotionController(props: Parameters<typeof useOrbitPhysics>[0]) {
  useOrbitPhysics(props);
  return null;
}

export function OrbitingTrackCarousel({
  tracks,
  selectedIndex,
  playingTrackId,
  onSelectedIndexChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  paused,
}: {
  tracks: MusicTrack[];
  selectedIndex: number;
  playingTrackId: string | null;
  onSelectedIndexChange: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  paused: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const isPhone = useIsPhone();
  const [orbitNode, setOrbitNode] = useState<HTMLDivElement | null>(null);
  const visibleLimit = isPhone ? 1 : 9;
  const visibleEntries = useMemo(() => {
    if (tracks.length <= visibleLimit) return tracks.map((track, queueIndex) => ({ track, queueIndex }));
    const half = Math.floor(visibleLimit / 2);
    const start = Math.max(0, Math.min(selectedIndex - half, tracks.length - visibleLimit));
    return tracks.slice(start, start + visibleLimit).map((track, offset) => ({ track, queueIndex: start + offset }));
  }, [selectedIndex, tracks, visibleLimit]);
  const visibleSelectedIndex = Math.max(0, visibleEntries.findIndex((entry) => entry.queueIndex === selectedIndex));
  const radius = isPhone ? "0px" : "var(--music-orbit-radius, 210px)";
  const style = { "--itemCount": Math.max(visibleEntries.length, 1), "--radius": radius } as CSSProperties;
  const selectVisible = useCallback((visibleIndex: number) => {
    const queueIndex = visibleEntries[visibleIndex]?.queueIndex;
    if (queueIndex !== undefined) onSelectedIndexChange(queueIndex);
  }, [onSelectedIndexChange, visibleEntries]);

  return (
    <div className="music-orbit-layer" aria-label={isPhone ? "Now playing record" : "Track carousel"}>
      <div
        ref={setOrbitNode}
        className="music-orbit"
        data-single={visibleEntries.length === 1}
        style={style}
      >
        {visibleEntries.map(({ track, queueIndex }, visibleIndex) => (
          <OrbitingTrackCard
            key={track.id}
            track={track}
            index={visibleIndex}
            queuePosition={queueIndex}
            queueLength={tracks.length}
            selected={queueIndex === selectedIndex}
            playing={track.id === playingTrackId}
          />
        ))}
      </div>
      {orbitNode && !isPhone && (
        <OrbitMotionController
          orbitNode={orbitNode}
          itemCount={visibleEntries.length}
          selectedIndex={visibleSelectedIndex}
          onSelect={selectVisible}
          paused={paused || visibleEntries.length <= 1}
          reduceMotion={Boolean(reducedMotion)}
        />
      )}
      {tracks.length > 1 && !isPhone && (
        <div className="music-orbit-controls" aria-label="Browse tracks">
          <button type="button" className="music-orbit-control focus-ring-premium" onClick={onPrevious} disabled={!hasPrevious} aria-label="Previous track">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="music-orbit-control focus-ring-premium" onClick={onNext} disabled={!hasNext} aria-label="Next track">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}