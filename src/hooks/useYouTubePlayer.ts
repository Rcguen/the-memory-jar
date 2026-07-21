"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MusicPlayerController, MusicPlayerSnapshot, MusicSource } from "@/types/music";

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
      ready?: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady?: () => void;
    __tmjYouTubeApiPromise?: Promise<NonNullable<Window["YT"]>>;
  }
}

type YouTubeVideoData = {
  video_id?: string;
  title?: string;
  author?: string;
};

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  cueVideoById: (videoId: string) => void;
  cuePlaylist: (options: { list: string; index?: number }) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaylist: () => string[] | null;
  getPlaylistIndex: () => number;
  getVideoData: () => YouTubeVideoData;
  destroy: () => void;
};

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("unavailable"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__tmjYouTubeApiPromise) return window.__tmjYouTubeApiPromise;

  window.__tmjYouTubeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { scriptLoads: 1 });
    }
    script.addEventListener("error", () => reject(new Error("load-failed")), { once: true });
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("load-failed"));
    };
  });
  return window.__tmjYouTubeApiPromise;
}

function stateFromYouTube(code: number): MusicPlayerSnapshot["state"] {
  if (typeof window === "undefined" || !window.YT) return "idle";
  if (code === window.YT.PlayerState.PLAYING) return "playing";
  if (code === window.YT.PlayerState.PAUSED) return "paused";
  if (code === window.YT.PlayerState.BUFFERING) return "buffering";
  if (code === window.YT.PlayerState.ENDED) return "ended";
  return "ready";
}

function sourceKey(source: MusicSource | null) {
  if (!source) return undefined;
  return source.kind === "youtube-video"
    ? `video:${source.videoId}`
    : `playlist:${source.playlistId}:${source.playlistIndex}`;
}
function samePlaylist(left?: string[], right?: string[]) {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function useYouTubePlayer(source: MusicSource | null) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const sourceRef = useRef(source);
  const readyRef = useRef(false);
  const metadataTimersRef = useRef<number[]>([]);
  const [snapshot, setSnapshot] = useState<MusicPlayerSnapshot>({
    state: "idle",
    currentTime: 0,
    duration: 0,
  });

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const readPlayerData = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const data = player.getVideoData?.() ?? {};
    const playlist = player.getPlaylist?.() ?? undefined;
    const playlistIndex = player.getPlaylistIndex?.();
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();

    setSnapshot((previous) => {
      const videoData = {
        videoId: data.video_id,
        title: data.title,
        author: data.author,
      };
      const unchanged =
        currentTime === previous.currentTime &&
        duration === previous.duration &&
        videoData.videoId === previous.videoData?.videoId &&
        videoData.title === previous.videoData?.title &&
        videoData.author === previous.videoData?.author &&
        playlistIndex === previous.playlistIndex &&
        samePlaylist(playlist, previous.playlistVideoIds);
      return unchanged
        ? previous
        : { ...previous, currentTime, duration, videoData, playlistVideoIds: playlist, playlistIndex };
    });
  }, []);

  const schedulePlayerDataReads = useCallback(() => {
    metadataTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    metadataTimersRef.current = [0, 250, 900].map((delay) =>
      window.setTimeout(readPlayerData, delay),
    );
  }, [readPlayerData]);

  const cueSource = useCallback((nextSource: MusicSource | null) => {
    const player = playerRef.current;
    if (!player || !readyRef.current || !nextSource) return;

    const currentData = player.getVideoData?.();
    if (nextSource.kind === "youtube-video") {
      if (currentData?.video_id !== nextSource.videoId) player.cueVideoById(nextSource.videoId);
    } else {
      const currentIndex = player.getPlaylistIndex?.();
      const alreadyAtSource =
        currentIndex === nextSource.playlistIndex &&
        (!nextSource.videoId || currentData?.video_id === nextSource.videoId);
      if (!alreadyAtSource) {
        player.cuePlaylist({ list: nextSource.playlistId, index: nextSource.playlistIndex });
      }
    }

    setSnapshot((previous) => ({
      ...previous,
      state: "ready",
      currentTime: 0,
      duration: 0,
      error: undefined,
      sourceKey: sourceKey(nextSource),
    }));
    schedulePlayerDataReads();
  }, [schedulePlayerDataReads]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !sourceRef.current) return;
    let alive = true;

    void loadYouTubeApi().then((YT) => {
      if (!alive || !host) return;
      const player = new YT.Player(host, {
        height: "1",
        width: "1",
        playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1 },
        events: {
          onReady: () => {
            if (!alive) return;
            readyRef.current = true;
            cueSource(sourceRef.current);
            if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { playerCreates: 1 });
          },
          onStateChange: (event: { data: number }) => {
            if (!alive) return;
            setSnapshot((previous) => ({ ...previous, state: stateFromYouTube(event.data) }));
            readPlayerData();
            if (event.data === YT.PlayerState.CUED || event.data === YT.PlayerState.PLAYING) {
              schedulePlayerDataReads();
            }
          },
          onError: () => {
            if (!alive) return;
            setSnapshot((previous) => ({
              ...previous,
              state: "error",
              error: "This song is not available in the player.",
              sourceKey: sourceKey(sourceRef.current),
            }));
          },
        },
      });
      playerRef.current = player;
    }).catch(() => {
      if (alive) {
        setSnapshot({
          state: "error",
          currentTime: 0,
          duration: 0,
          error: "This link could not be opened.",
          sourceKey: sourceKey(sourceRef.current),
        });
      }
    });

    return () => {
      alive = false;
      readyRef.current = false;
      metadataTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      metadataTimersRef.current = [];
      playerRef.current?.destroy();
      playerRef.current = null;
      host.replaceChildren();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { playerDestroys: 1 });
    };
  }, [cueSource, readPlayerData, schedulePlayerDataReads]);

  useEffect(() => {
    cueSource(source);
  }, [cueSource, source]);

  useEffect(() => {
    if (snapshot.state !== "playing" && snapshot.state !== "buffering") return;
    const timer = window.setInterval(readPlayerData, 500);
    return () => window.clearInterval(timer);
  }, [readPlayerData, snapshot.state]);

  const controller = useMemo<MusicPlayerController>(() => ({
    play: async () => {
      playerRef.current?.playVideo();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { plays: 1 });
    },
    pause: () => {
      playerRef.current?.pauseVideo();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { pauses: 1 });
    },
    seek: (seconds) => {
      playerRef.current?.seekTo(seconds, true);
      readPlayerData();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { seeks: 1 });
    },
  }), [readPlayerData]);

  return { hostRef, snapshot, controller };
}