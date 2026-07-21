"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMusicQueue } from "@/hooks/useMusicQueue";
import { parseYouTubeLinks, youtubeArtworkCandidates } from "@/lib/music/youtube-url";
import type { MusicPlayerController, MusicPlayerSnapshot, MusicTrack } from "@/types/music";
import { OrbitingTrackCarousel } from "./OrbitingTrackCarousel";
import { PersistentMusicPlayer } from "./PersistentMusicPlayer";
import { YouTubeMusicPlayer } from "./YouTubeMusicPlayer";

const EMPTY_SNAPSHOT: MusicPlayerSnapshot = { state: "idle", currentTime: 0, duration: 0 };

type SubmissionMode = "append" | "replace";

type SourceFeedback = {
  message: string;
  tone: "success" | "notice";
} | null;

function trackFromParsed(
  parsed: ReturnType<typeof parseYouTubeLinks>["parsed"][number],
): MusicTrack {
  if (parsed.kind === "youtube-video") {
    return {
      id: `video:${parsed.videoId}`,
      videoId: parsed.videoId,
      title: "YouTube song",
      artist: "YouTube",
      artworkUrl: youtubeArtworkCandidates(parsed.videoId)[0] ?? "",
      metadataStatus: "placeholder",
      source: { kind: "youtube-video", videoId: parsed.videoId },
    };
  }

  return {
    id: `playlist:${parsed.playlistId}`,
    playlistId: parsed.playlistId,
    title: "YouTube playlist",
    artist: "Playlist",
    artworkUrl: youtubeArtworkCandidates(parsed.videoId)[0] ?? "",
    metadataStatus: "placeholder",
    source: {
      kind: "youtube-playlist-item",
      playlistId: parsed.playlistId,
      videoId: parsed.videoId,
      playlistIndex: 0,
    },
  };
}

function trackSourceKey(track: MusicTrack | null) {
  if (!track) return undefined;
  return track.source.kind === "youtube-video"
    ? `video:${track.source.videoId}`
    : `playlist:${track.source.playlistId}:${track.source.playlistIndex}`;
}
function playlistTracks(playlistId: string, videoIds: string[]): MusicTrack[] {
  return videoIds.map((videoId, index) => ({
    id: `video:${videoId}`,
    videoId,
    playlistId,
    playlistIndex: index,
    title: `Track ${index + 1}`,
    artist: "YouTube playlist",
    artworkUrl: youtubeArtworkCandidates(videoId)[0] ?? "",
    metadataStatus: "placeholder",
    source: {
      kind: "youtube-playlist-item",
      playlistId,
      playlistIndex: index,
      videoId,
    },
  }));
}

export function MusicExperience({ paused, onClose }: { paused: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SourceFeedback>(null);
  const [snapshot, setSnapshot] = useState<MusicPlayerSnapshot>(EMPTY_SNAPSHOT);
  const [controller, setController] = useState<MusicPlayerController | null>(null);
  const [isPlayerExpanded, setPlayerExpanded] = useState(false);
  const handledEndedTrackRef = useRef<string | null>(null);
  const {
    tracks,
    selectedIndex,
    selectedTrack,
    appendTracks,
    replaceQueue,
    selectTrack,
    removeTrack,
    clearQueue,
    previousTrack,
    nextTrack,
    expandPlaylist,
    updateTrackMetadata,
    markUnavailable,
    hasPrevious,
    hasNext,
  } = useMusicQueue();

  const submitSources = useCallback((mode: SubmissionMode) => {
    const { parsed, invalidCount } = parseYouTubeLinks(input);
    if (parsed.length === 0) {
      setInputError("Paste one or more YouTube video or playlist links.");
      setFeedback(null);
      return;
    }

    const incoming = parsed.map((item) => trackFromParsed(item));
    const result = mode === "replace" ? replaceQueue(incoming) : appendTracks(incoming);
    const songWord = result.added === 1 ? "song" : "songs";
    let message = result.added > 0 ? `${result.added} ${songWord} added` : "No new songs were added";
    if (result.duplicates === 1 && incoming.length === 1) message = "This song is already in your radio";
    else if (result.duplicates > 0) message += ` · ${result.duplicates} already in your radio`;
    if (invalidCount > 0) message += ` · ${invalidCount} link${invalidCount === 1 ? "" : "s"} could not be opened`;

    setInput("");
    setInputError(invalidCount > 0 ? "Some links could not be opened." : null);
    setFeedback({ message, tone: result.added > 0 ? "success" : "notice" });
  }, [appendTracks, input, replaceQueue]);

  const handleAppend = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSources("append");
  }, [submitSources]);

  const handleReplace = useCallback(() => submitSources("replace"), [submitSources]);
  const receiveSnapshot = useCallback((next: MusicPlayerSnapshot) => setSnapshot(next), []);
  const receiveController = useCallback((next: MusicPlayerController) => setController(next), []);

  useEffect(() => {
    const playlistId = selectedTrack?.playlistId;
    const videoIds = snapshot.playlistVideoIds;
    if (!playlistId || selectedTrack.videoId || !videoIds?.length) return;
    expandPlaylist(playlistId, playlistTracks(playlistId, videoIds), snapshot.playlistIndex ?? 0);
  }, [expandPlaylist, selectedTrack, snapshot.playlistIndex, snapshot.playlistVideoIds]);

  useEffect(() => {
    const videoId = snapshot.videoData?.videoId;
    if (!videoId) return;
    updateTrackMetadata(videoId, {
      title: snapshot.videoData?.title,
      artist: snapshot.videoData?.author,
    });
  }, [snapshot.videoData, updateTrackMetadata]);

  useEffect(() => {
    if (snapshot.state !== "error" || !selectedTrack || snapshot.sourceKey !== trackSourceKey(selectedTrack)) return;
    markUnavailable(selectedTrack.id);
  }, [markUnavailable, selectedTrack, snapshot.sourceKey, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "ended" || !selectedTrack || !hasNext) return;
    if (handledEndedTrackRef.current === selectedTrack.id) return;
    handledEndedTrackRef.current = selectedTrack.id;
    nextTrack();
  }, [hasNext, nextTrack, selectedTrack, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "ended") handledEndedTrackRef.current = null;
  }, [snapshot.state]);

  const playerSource = selectedTrack?.source ?? null;
  const isPlaying = snapshot.state === "playing" || snapshot.state === "buffering";
  const queueStatus = useMemo(() => `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`, [tracks.length]);

  return (
    <>
      {tracks.length > 0 && (
        <OrbitingTrackCarousel
          tracks={tracks}
          selectedIndex={selectedIndex}
          playingTrackId={isPlaying ? selectedTrack?.id ?? null : null}
          onSelectedIndexChange={selectTrack}
          onPrevious={previousTrack}
          onNext={nextTrack}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          paused={paused}
        />
      )}
      {playerSource && (
        <YouTubeMusicPlayer
          source={playerSource}
          onSnapshot={receiveSnapshot}
          onController={receiveController}
        />
      )}
      {typeof document !== "undefined" &&
        createPortal(
          <PersistentMusicPlayer
            tracks={tracks}
            selectedIndex={selectedIndex}
            track={selectedTrack}
            snapshot={snapshot}
            controller={controller}
            sourceInput={input}
            expanded={isPlayerExpanded}
            sourceError={inputError}
            sourceFeedback={feedback}
            queueStatus={queueStatus}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onExpandedChange={setPlayerExpanded}
            onSourceInputChange={(value) => {
              setInput(value);
              setInputError(null);
              setFeedback(null);
            }}
            onSourceSubmit={handleAppend}
            onReplaceQueue={handleReplace}
            onSelectTrack={selectTrack}
            onRemoveTrack={removeTrack}
            onClearQueue={clearQueue}
            onPrevious={previousTrack}
            onNext={nextTrack}
            onClose={onClose}
          />,
          document.body,
        )}
    </>
  );
}