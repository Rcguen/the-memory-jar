"use client";

import { ChevronDown, Pause, Play, Settings2, SkipBack, SkipForward, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import type { MusicPlayerController, MusicPlayerSnapshot, MusicTrack } from "@/types/music";
import { MusicVisualizer } from "./MusicVisualizer";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function PersistentMusicPlayer({
  track,
  snapshot,
  controller,
  sourceInput,
  sourceError,
  expanded,
  onExpandedChange,
  onSourceInputChange,
  onSourceSubmit,
  onClose,
}: {
  track: MusicTrack | null;
  snapshot: MusicPlayerSnapshot;
  controller: MusicPlayerController | null;
  sourceInput: string;
  sourceError: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSourceInputChange: (value: string) => void;
  onSourceSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}) {
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousExpandedRef = useRef(expanded);
  const position = scrubbing ?? snapshot.currentTime;
  const playable = snapshot.state !== "idle" && snapshot.state !== "error" && controller !== null;
  const isPlaying = snapshot.state === "playing" || snapshot.state === "buffering";
  const duration = Math.max(snapshot.duration, 0);

  useEffect(() => {
    const wasExpanded = previousExpandedRef.current;
    if (expanded && !wasExpanded) inputRef.current?.focus();
    if (!expanded && wasExpanded) expandButtonRef.current?.focus();
    previousExpandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (expanded) onExpandedChange(false);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, onClose, onExpandedChange]);

  return (
    <section className="persistent-music-player" data-expanded={expanded} aria-label="Music player">
      {expanded && (
        <div id="music-source-editor" className="music-player-source-editor">
          <div className="music-player-source-editor__header">
            <span className="music-player-source-editor__handle" aria-hidden="true" />
            <div>
              <span className="persistent-music-player__eyebrow">Choose the soundtrack</span>
              <strong>Set the mood around your jar</strong>
            </div>
            <button type="button" className="music-player-collapse focus-ring-premium" onClick={() => onExpandedChange(false)} aria-label="Collapse player">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={onSourceSubmit} className="music-player-source-form">
            <label className="sr-only" htmlFor="music-youtube-url">YouTube video or playlist link</label>
            <input
              ref={inputRef}
              id="music-youtube-url"
              value={sourceInput}
              onChange={(event) => onSourceInputChange(event.target.value)}
              placeholder="Paste a YouTube video or playlist"
              inputMode="url"
              autoComplete="url"
              autoFocus={!track}
              aria-invalid={Boolean(sourceError)}
              aria-describedby={sourceError ? "music-source-error" : undefined}
            />
            <button type="submit" className="focus-ring-premium">Set the mood</button>
          </form>
          {sourceError && <p id="music-source-error" className="music-player-source-error" role="status">{sourceError}</p>}
        </div>
      )}

      <div className="persistent-music-player__dock">
        <MusicVisualizer state={snapshot.state} />
        <div className="persistent-music-player__copy">
          <span className="persistent-music-player__eyebrow">Our Little Radio</span>
          <strong>{track?.title ?? "Choose something to play"}</strong>
          <span>{track?.artist ?? "YouTube video or playlist"}</span>
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
        <button
          ref={expandButtonRef}
          type="button"
          className="music-player-change focus-ring-premium"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-controls="music-source-editor"
          aria-label={expanded ? "Collapse player" : "Expand player to change music"}
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span>Change music</span>
        </button>
        <button type="button" className="music-player-close focus-ring-premium" onClick={onClose} aria-label="Close music"><X className="h-4 w-4" /></button>
        <div className="persistent-music-player__progress">
          <span>{formatTime(position)}</span>
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
          <span>{formatTime(duration)}</span>
        </div>
        {snapshot.error && <p className="persistent-music-player__error" role="status">{snapshot.error}</p>}
      </div>
    </section>
  );
}