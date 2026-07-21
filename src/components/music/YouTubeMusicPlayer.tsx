"use client";

import { useEffect } from "react";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import type { MusicPlayerController, MusicPlayerSnapshot, MusicSource } from "@/types/music";

export function YouTubeMusicPlayer({
  source,
  onSnapshot,
  onController,
}: {
  source: MusicSource;
  onSnapshot: (snapshot: MusicPlayerSnapshot) => void;
  onController: (controller: MusicPlayerController) => void;
}) {
  const { hostRef, snapshot, controller } = useYouTubePlayer(source);

  useEffect(() => onSnapshot(snapshot), [onSnapshot, snapshot]);
  useEffect(() => onController(controller), [controller, onController]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-px w-px opacity-0"
      aria-hidden="true"
    />
  );
}