"use client";

import { useMemo } from "react";
import { Disc3, Loader2, Music2, Pause, Play } from "lucide-react";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import type { MemorySoundtrack } from "@/types/memory";
import type { MusicSource } from "@/types/music";

function toMusicSource(soundtrack: MemorySoundtrack): MusicSource {
  if (soundtrack.source_kind === "youtube_video") {
    return { kind: "youtube-video", videoId: soundtrack.video_id };
  }

  return {
    kind: "youtube-playlist-item",
    playlistId: soundtrack.playlist_id,
    playlistIndex: soundtrack.playlist_index,
    videoId: soundtrack.video_id ?? undefined,
  };
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

export function MemorySoundtrackPlayer({
  soundtrack,
  memoryTitle,
}: {
  soundtrack: MemorySoundtrack;
  memoryTitle: string | null;
}) {
  const source = useMemo(() => toMusicSource(soundtrack), [soundtrack]);
  const { hostRef, snapshot, controller } = useYouTubePlayer(source);
  const isPlaying = snapshot.state === "playing";
  const isBusy = snapshot.state === "buffering";
  const isUnavailable = snapshot.state === "error";
  const duration = snapshot.duration;
  const progress = duration > 0
    ? Math.min(100, Math.max(0, (snapshot.currentTime / duration) * 100))
    : 0;

  const isLoading = snapshot.state === "idle";

  const togglePlayback = () => {
    if (isPlaying) {
      controller.pause();
      return;
    }
    console.debug("[soundtrack] click", {
      state: snapshot.state,
      autoplayBlocked: snapshot.autoplayBlocked,
      isLoading,
      isBusy,
      isUnavailable,
    });
    void controller.play();
  };

  return (
    <aside
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.8rem)] left-1/2 z-[170] w-[min(calc(100vw-1rem),28rem)] -translate-x-1/2 rounded-xl border border-stone-200/80 bg-[#181713]/95 p-2 text-stone-100 shadow-[0_16px_45px_rgba(0,0,0,0.32)] backdrop-blur-md sm:bottom-6 sm:w-[min(32rem,calc(100vw-2rem))]"
      aria-label={`Soundtrack for ${memoryTitle || "this memory"}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-900">
          {soundtrack.artwork_url ? (
            // YouTube artwork is public metadata and is not private memory media.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={soundtrack.artwork_url}
              alt=""
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Disc3 className="h-5 w-5 text-stone-400" aria-hidden="true" />
          )}
          <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-inter text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-300/80">
            <Music2 className="h-3 w-3" aria-hidden="true" />
            Memory soundtrack
          </p>
          <p className="mt-0.5 truncate font-cormorant text-base font-semibold leading-tight">
            {soundtrack.title}
          </p>
          <p className="truncate font-inter text-[10px] text-stone-400">
            {soundtrack.artist || "YouTube"}
          </p>
        </div>

        <button
          type="button"
          onClick={togglePlayback}
          disabled={isLoading || isBusy || isUnavailable}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-[transform,background-color] duration-150 hover:bg-rose-400 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 motion-reduce:transform-none motion-reduce:transition-none"
          aria-label={isPlaying ? "Pause memory soundtrack" : "Play memory soundtrack"}
        >
          {isLoading || isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 px-0.5">
        <span className="w-7 text-right font-inter text-[9px] tabular-nums text-stone-500">
          {formatTime(snapshot.currentTime)}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span
            className="block h-full w-full origin-left rounded-full bg-rose-400 transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
        <span className="w-7 font-inter text-[9px] tabular-nums text-stone-500">
          {formatTime(duration)}
        </span>
      </div>

      {isUnavailable && (
        <p className="mt-1 px-1 font-inter text-[10px] text-rose-300" role="status">
          This soundtrack is not available right now.
        </p>
      )}

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 mix-blend-difference"
        aria-hidden="true"
      >
        <div ref={hostRef} />
      </div>
    </aside>
  );
}

