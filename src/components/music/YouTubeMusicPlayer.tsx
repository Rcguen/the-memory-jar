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
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 mix-blend-difference"
      aria-hidden="true"
    >
      <div ref={hostRef} />
    </div>
  );
}