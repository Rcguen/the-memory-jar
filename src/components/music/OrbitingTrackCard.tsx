"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Music2 } from "lucide-react";
import { youtubeArtworkCandidates } from "@/lib/music/youtube-url";
import type { MusicTrack } from "@/types/music";

export function VinylRecord({
  track,
  playing = false,
  selected = false,
  compact = false,
}: {
  track: MusicTrack | null;
  playing?: boolean;
  selected?: boolean;
  compact?: boolean;
}) {
  const candidates = useMemo(() => {
    const all = [track?.artworkUrl ?? "", ...youtubeArtworkCandidates(track?.videoId)];
    return [...new Set(all.filter(Boolean))];
  }, [track?.artworkUrl, track?.videoId]);
  const trackId = track?.id ?? "empty";
  const [failure, setFailure] = useState({ trackId, candidateIndex: 0 });
  const candidateIndex = failure.trackId === trackId ? failure.candidateIndex : 0;
  const artwork = candidates[candidateIndex];
  return (
    <span
      className="vinyl-record"
      data-playing={playing}
      data-selected={selected}
      data-compact={compact}
      aria-hidden="true"
    >
      <span className="vinyl-grooves" />
      <span className="vinyl-label">
        {artwork ? (
          // Artwork is derived from a user-provided YouTube video ID.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="vinyl-label-artwork"
            src={artwork}
            alt=""
            loading={selected ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailure({ trackId, candidateIndex: candidateIndex + 1 })}
          />
        ) : (
          <span className="vinyl-label-fallback"><Music2 aria-hidden="true" /></span>
        )}
      </span>
      <span className="vinyl-center-ring" />
      <span className="vinyl-center-hole" />
    </span>
  );
}

export function OrbitingTrackCard({
  track,
  index,
  queuePosition,
  queueLength,
  selected,
  playing,
}: {
  track: MusicTrack;
  index: number;
  queuePosition: number;
  queueLength: number;
  selected: boolean;
  playing: boolean;
}) {
  const title = track.artist ? `${track.title} by ${track.artist}` : track.title;
  const state = playing ? "playing" : selected ? "selected" : "";
  return (
    <button
      type="button"
      style={{ "--item": index } as CSSProperties}
      className="track-orbit-item focus-ring-premium"
      aria-label={`${title}, ${queuePosition + 1} of ${queueLength}${state ? `, ${state}` : ""}`}
      aria-pressed={selected}
      aria-current={selected ? "true" : undefined}
    >
      <span className="track-orbit-card" data-selected={selected} data-playing={playing}>
        <span className="vinyl-interaction-surface">
          <VinylRecord track={track} playing={playing} selected={selected} />
          <span className="track-metadata">
            <span className="track-metadata__state">{playing ? "Now playing" : selected ? "Selected" : "In your radio"}</span>
            <span className="track-metadata__title">{track.title}</span>
            <span className="track-metadata__artist">{track.unavailable ? "Unavailable" : track.artist ?? "YouTube"}</span>
          </span>
        </span>
      </span>
    </button>
  );
}