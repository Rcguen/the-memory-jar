"use client";

import { Music2, X } from "lucide-react";
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
      <section className="music-source-panel surface-paper" aria-label="Our Little Radio">
        <div className="music-source-panel__heading"><Music2 className="h-4 w-4" aria-hidden="true" /><span>Our Little Radio</span></div>
        <button type="button" className="music-source-panel__close focus-ring-premium" onClick={onClose} aria-label="Close music"><X className="h-4 w-4" /></button>
        <form onSubmit={submitSource} className="music-source-panel__form">
          <label className="sr-only" htmlFor="music-youtube-url">YouTube video or playlist link</label>
          <input id="music-youtube-url" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste a YouTube link" inputMode="url" autoComplete="url" />
          <button type="submit" className="focus-ring-premium">Set the mood</button>
        </form>
        {inputError && <p className="music-source-panel__error" role="status">{inputError}</p>}
      </section>
      {carouselTracks.length > 0 && (
        <OrbitingTrackCarousel tracks={carouselTracks} selectedIndex={selectedIndex} onSelectedIndexChange={selectTrack} paused={paused} />
      )}
      {activeSource && <YouTubeMusicPlayer source={activeSource} onSnapshot={receiveSnapshot} onController={receiveController} />}
      {selectedTrack && <PersistentMusicPlayer track={selectedTrack} snapshot={snapshot} controller={controller} onClose={onClose} />}
    </>
  );
}