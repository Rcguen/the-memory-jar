"use client";

import type { CSSProperties } from "react";
import { Music2 } from "lucide-react";
import type { MusicTrack } from "@/types/music";

export function OrbitingTrackCard({ track, index, selected }: { track: MusicTrack; index: number; selected: boolean }) {
  const label = track.artist ? `${track.title} by ${track.artist}` : track.title;
  return (
    <button type="button" style={{ "--item": index } as CSSProperties} className="track-orbit-item focus-ring-premium" aria-label={`Select ${label}`} aria-pressed={selected}>
      <span className="track-orbit-card"><span className="track-orbit-card__surface">
        {track.artworkUrl ? (<>
          {/* Track art can come from a user-entered YouTube source, so Next Image host allowlisting is not applicable. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="track-orbit-card__art" src={track.artworkUrl} alt="" />
        </>) : <span className="track-orbit-card__placeholder" aria-hidden="true"><Music2 className="h-5 w-5" /></span>}
        <span className="track-orbit-card__copy"><span className="track-orbit-card__title">{track.title}</span>{track.artist && <span className="track-orbit-card__artist">{track.artist}</span>}</span>
      </span></span>
    </button>
  );
}