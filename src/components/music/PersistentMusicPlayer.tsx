"use client";

import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useState } from "react";
import type { MusicPlayerController, MusicPlayerSnapshot, MusicTrack } from "@/types/music";
import { MusicVisualizer } from "./MusicVisualizer";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function PersistentMusicPlayer({ track, snapshot, controller, onClose }: {
  track: MusicTrack;
  snapshot: MusicPlayerSnapshot;
  controller: MusicPlayerController | null;
  onClose: () => void;
}) {
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const position = scrubbing ?? snapshot.currentTime;
  const playable = snapshot.state !== "idle" && snapshot.state !== "error" && controller !== null;
  const isPlaying = snapshot.state === "playing" || snapshot.state === "buffering";
  const duration = Math.max(snapshot.duration, 0);

  return (
    <section className="persistent-music-player" aria-label="Music player">
      <MusicVisualizer state={snapshot.state} />
      <div className="persistent-music-player__copy">
        <span className="persistent-music-player__eyebrow">Our Little Radio</span>
        <strong>{track.title}</strong>
        {track.artist && <span>{track.artist}</span>}
      </div>
      <div className="persistent-music-player__controls">
        <button type="button" className="music-player-icon focus-ring-premium" onClick={controller?.previous} disabled={!playable} aria-label="Previous video"><SkipBack className="h-4 w-4" /></button>
        <button
          type="button"
          className="music-player-play focus-ring-premium"
          onClick={() => { if (isPlaying) controller?.pause(); else void controller?.play(); }}
          disabled={!playable}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </button>
        <button type="button" className="music-player-icon focus-ring-premium" onClick={controller?.next} disabled={!playable} aria-label="Next video"><SkipForward className="h-4 w-4" /></button>
      </div>
      <div className="persistent-music-player__progress">
        <input
          aria-label="Seek through track"
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={Math.min(position, duration || 1)}
          disabled={!playable || duration === 0}
          onChange={(event) => setScrubbing(Number(event.target.value))}
          onPointerUp={(event) => { controller?.seek(Number((event.target as HTMLInputElement).value)); setScrubbing(null); }}
          onKeyUp={(event) => { controller?.seek(Number((event.target as HTMLInputElement).value)); setScrubbing(null); }}
          onBlur={() => setScrubbing(null)}
        />
        <span>{formatTime(position)}</span><span>{formatTime(duration)}</span>
      </div>
      {snapshot.error && <p className="persistent-music-player__error" role="status">{snapshot.error}</p>}
      <button type="button" className="music-player-close focus-ring-premium" onClick={onClose} aria-label="Close music"><X className="h-4 w-4" /></button>
    </section>
  );
}