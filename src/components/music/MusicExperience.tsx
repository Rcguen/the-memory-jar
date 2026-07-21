"use client";

import { useCallback, useMemo, useState } from "react";
import { parseYouTubeUrl } from "@/lib/music/youtube-url";
import type { MusicPlayerController, MusicPlayerSnapshot, MusicSource, MusicTrack } from "@/types/music";
import { OrbitingTrackCarousel } from "./OrbitingTrackCarousel";
import { PersistentMusicPlayer } from "./PersistentMusicPlayer";
import { YouTubeMusicPlayer } from "./YouTubeMusicPlayer";

const EMPTY_SNAPSHOT: MusicPlayerSnapshot = { state: "idle", currentTime: 0, duration: 0 };

function tracksForSource(source: MusicSource): MusicTrack[] {
  if (source.kind === "youtube-video") return [{ id: source.videoId, title: "A song for us", artist: "YouTube", source }];
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${source.playlistId}-${index}`,
    title: index === source.playlistIndex ? "A song for us" : `Playlist moment ${index + 1}`,
    artist: "YouTube playlist",
    source: { ...source, playlistIndex: index },
  }));
}

export function MusicExperience({ paused, onClose }: { paused: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeSource, setActiveSource] = useState<MusicSource | null>(null);
  const [snapshot, setSnapshot] = useState<MusicPlayerSnapshot>(EMPTY_SNAPSHOT);
  const [controller, setController] = useState<MusicPlayerController | null>(null);
  const [isPlayerExpanded, setPlayerExpanded] = useState(false);

  const selectedTrack = tracks[selectedIndex] ?? null;
  const submitSource = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseYouTubeUrl(input);
    if (parsed.kind === "invalid") { setInputError("Paste a YouTube video or playlist link."); return; }
    const source: MusicSource = parsed.kind === "youtube-video"
      ? { kind: "youtube-video", videoId: parsed.videoId }
      : { kind: "youtube-playlist-item", playlistId: parsed.playlistId, videoId: parsed.videoId, playlistIndex: 0 };
    const nextTracks = tracksForSource(source);
    setTracks(nextTracks);
    setSelectedIndex(0);
    setActiveSource(nextTracks[0].source);
    setSnapshot(EMPTY_SNAPSHOT);
    setInputError(null);
    setPlayerExpanded(false);
  };
  const selectTrack = useCallback((index: number) => {
    setSelectedIndex(index);
    setActiveSource((current) => tracks[index]?.source ?? current);
  }, [tracks]);
  const receiveSnapshot = useCallback((next: MusicPlayerSnapshot) => setSnapshot(next), []);
  const receiveController = useCallback((next: MusicPlayerController) => setController(next), []);
  const carouselTracks = useMemo(() => tracks, [tracks]);

  return (
    <>
      {carouselTracks.length > 0 && (
        <OrbitingTrackCarousel tracks={carouselTracks} selectedIndex={selectedIndex} onSelectedIndexChange={selectTrack} paused={paused} />
      )}
      {activeSource && <YouTubeMusicPlayer source={activeSource} onSnapshot={receiveSnapshot} onController={receiveController} />}
      <PersistentMusicPlayer
        track={selectedTrack}
        snapshot={snapshot}
        controller={controller}
        sourceInput={input}
        expanded={isPlayerExpanded}
        onExpandedChange={setPlayerExpanded}
        sourceError={inputError}
        onSourceInputChange={setInput}
        onSourceSubmit={submitSource}
        onClose={onClose}
      />
    </>
  );
}