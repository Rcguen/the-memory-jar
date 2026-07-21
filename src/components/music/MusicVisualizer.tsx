"use client";

import type { CSSProperties } from "react";
import type { MusicPlaybackState } from "@/types/music";

const BAR_SEEDS = [0.45, 0.72, 0.58, 0.9, 0.38, 0.66, 0.82, 0.5, 0.76, 0.42, 0.94, 0.62, 0.54, 0.84, 0.48, 0.7];

export function MusicVisualizer({ state }: { state: MusicPlaybackState }) {
  const active = state === "playing" || state === "buffering";
  return (
    <div className={`music-visualizer ${active ? "music-visualizer--active" : ""} ${state === "buffering" ? "music-visualizer--buffering" : ""}`} aria-hidden="true">
      {BAR_SEEDS.map((seed, index) => <span key={index} style={{ "--bar-seed": seed, "--bar-delay": `${index * -0.09}s` } as CSSProperties} />)}
    </div>
  );
}