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

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  previousVideo: () => void;
  nextVideo: () => void;
  cueVideoById: (videoId: string) => void;
  cuePlaylist: (options: { list: string; index?: number }) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("unavailable"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__tmjYouTubeApiPromise) return window.__tmjYouTubeApiPromise;

  window.__tmjYouTubeApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("load-failed"));
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("load-failed"));
    };
    document.head.appendChild(script);
    if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { scriptLoads: 1 });
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

export function useYouTubePlayer(source: MusicSource | null) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [snapshot, setSnapshot] = useState<MusicPlayerSnapshot>({ state: "idle", currentTime: 0, duration: 0 });

  const refreshTime = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    setSnapshot((previous) => currentTime === previous.currentTime && duration === previous.duration ? previous : { ...previous, currentTime, duration });
  }, []);

  useEffect(() => {
    if (snapshot.state !== "playing" && snapshot.state !== "buffering") return;
    const timer = window.setInterval(refreshTime, 500);
    return () => window.clearInterval(timer);
  }, [refreshTime, snapshot.state]);

  useEffect(() => {
    const host = hostRef.current;
    if (!source || !host) return;
    let alive = true;
    setSnapshot({ state: "idle", currentTime: 0, duration: 0 });

    void loadYouTubeApi().then((YT) => {
      if (!alive || !host) return;
      const player = new YT.Player(host, {
        height: "1",
        width: "1",
        playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1 },
        events: {
          onReady: () => {
            if (!alive) return;
            if (source.kind === "youtube-video") player.cueVideoById(source.videoId);
            else player.cuePlaylist({ list: source.playlistId, index: source.playlistIndex });
            setSnapshot({ state: "ready", currentTime: 0, duration: 0 });
            if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { playerCreates: 1 });
          },
          onStateChange: (event: { data: number }) => {
            if (!alive) return;
            setSnapshot((previous) => ({ ...previous, state: stateFromYouTube(event.data) }));
            refreshTime();
          },
          onError: () => {
            if (!alive) return;
            setSnapshot((previous) => ({ ...previous, state: "error", error: "This song is not available in the player." }));
          },
        },
      });
      playerRef.current = player;
    }).catch(() => {
      if (alive) setSnapshot({ state: "error", currentTime: 0, duration: 0, error: "This link could not be opened." });
    });

    return () => {
      alive = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      host.replaceChildren();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { playerDestroys: 1 });
    };
  }, [refreshTime, source]);

  const controller = useMemo<MusicPlayerController>(() => ({
    play: async () => {
      if (!playerRef.current) return;
      playerRef.current.playVideo();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { plays: 1 });
    },
    pause: () => {
      playerRef.current?.pauseVideo();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { pauses: 1 });
    },
    seek: (seconds) => {
      playerRef.current?.seekTo(seconds, true);
      refreshTime();
      if (process.env.NODE_ENV === "development") console.debug("[music-youtube]", { seeks: 1 });
    },
    previous: () => playerRef.current?.previousVideo(),
    next: () => playerRef.current?.nextVideo(),
  }), [refreshTime]);

  return { hostRef, snapshot, controller };
}