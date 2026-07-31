"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useListeningRoom } from "@/hooks/useListeningRoom";
import { useListeningRoomRealtime } from "@/hooks/useListeningRoomRealtime";
import { useMusicQueue } from "@/hooks/useMusicQueue";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import {
  createListeningRoomTrackCommand,
  musicSourceFromListeningRoom,
  musicTrackFromListeningRoom,
} from "@/lib/music/listening-room";
import { musicTrackFromSearchResult } from "@/lib/music/youtube-search";
import { parseYouTubeLinks, youtubeArtworkCandidates } from "@/lib/music/youtube-url";
import { useAuth } from "@/providers/auth-provider";
import type {
  ListeningRoom,
  ListeningRoomPlaybackCommand,
  MusicPlayerController,
  MusicPlayerSnapshot,
  MusicTrack,
  YouTubeMusicSearchResult,
} from "@/types/music";
import { OrbitingTrackCarousel } from "./OrbitingTrackCarousel";
import { PersistentMusicPlayer } from "./PersistentMusicPlayer";
import { YouTubeMusicPlayer } from "./YouTubeMusicPlayer";

const EMPTY_SNAPSHOT: MusicPlayerSnapshot = { state: "idle", currentTime: 0, duration: 0 };

type SubmissionMode = "append" | "replace";

type SourceFeedback = {
  message: string;
  tone: "success" | "notice";
} | null;

const remoteCommandCounters = {
  applied: 0,
  duplicatePrevented: 0,
  pendingReplaced: 0,
  ready: 0,
};

function recordRemoteCommand(
  event: keyof typeof remoteCommandCounters,
  revision?: number,
): void {
  if (process.env.NODE_ENV !== "development") return;
  remoteCommandCounters[event] += 1;
  console.debug("[listening-room] player command", {
    event,
    count: remoteCommandCounters[event],
    revision: typeof revision === "number" ? revision : null,
  });
}

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
    videoId: parsed.videoId,
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

function nextAvailableIndex(
  tracks: MusicTrack[],
  selectedIndex: number,
  direction: -1 | 1,
): number {
  let index = selectedIndex + direction;
  while (index >= 0 && index < tracks.length) {
    if (!tracks[index]?.unavailable) return index;
    index += direction;
  }
  return selectedIndex;
}

export function MusicExperience({ paused, onClose }: { paused: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const relationshipContextQuery = useRelationshipContext();
  const relationshipContext = relationshipContextQuery.data;
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SourceFeedback>(null);
  const [snapshot, setSnapshot] = useState<MusicPlayerSnapshot>(EMPTY_SNAPSHOT);
  const [controller, setController] = useState<MusicPlayerController | null>(null);
  const [isPlayerExpanded, setPlayerExpanded] = useState(false);
  const [readyRoomId, setReadyRoomId] = useState<string | null>(null);
  const handledEndedTrackRef = useRef<string | null>(null);
  const pendingPlayTrackIdRef = useRef<string | null>(null);
  const activeListenerRoomIdRef = useRef<string | null>(null);
  const latestCanonicalRevisionRef = useRef(-1);
  const lastAppliedPlayerRevisionRef = useRef(-1);
  const activeCommandTokenRef = useRef(0);
  const hostCommandPendingRef = useRef(false);
  const {
    tracks,
    selectedIndex,
    selectedTrack,
    appendTracks,
    replaceQueue,
    selectTrack,
    removeTrack,
    clearQueue,
    expandPlaylist,
    updateTrackMetadata,
    markUnavailable,
    hasPrevious,
    hasNext,
  } = useMusicQueue();

  const listeningRoom = useListeningRoom({
    relationshipId: relationshipContext?.relationshipId,
    profileId: profile?.id,
    enabled: true,
  });
  const room = listeningRoom.room;
  const activeParticipant = listeningRoom.currentParticipant?.leftAt === null
    ? listeningRoom.currentParticipant
    : null;
  const isHostActive = Boolean(
    room
    && activeParticipant?.role === "host"
    && profile?.id === room.hostId,
  );
  const isListenerActive = Boolean(
    room
    && activeParticipant?.role === "listener"
    && profile?.id !== room.hostId,
  );
  const listenerReady = Boolean(isListenerActive && room && readyRoomId === room.id);
  const isPlaying = snapshot.state === "playing" || snapshot.state === "buffering";
  const listenerBlocked = isListenerActive && listenerReady && snapshot.autoplayBlocked === true;
  const listenerBuffering = isListenerActive && listenerReady && snapshot.state === "buffering";
  const realtime = useListeningRoomRealtime({
    enabled: Boolean(room && activeParticipant && !room.endedAt),
    room,
    relationshipId: relationshipContext?.relationshipId,
    role: activeParticipant?.role ?? null,
    ready: isHostActive || listenerReady,
    buffering: listenerBuffering,
    blocked: listenerBlocked,
  });

  const ensureRoomTrack = useCallback((canonicalRoom: ListeningRoom) => {
    const roomTrack = musicTrackFromListeningRoom(canonicalRoom);
    if (!roomTrack) return null;
    const result = appendTracks([roomTrack]);
    selectTrack(result.selectedIndex);
    return roomTrack;
  }, [appendTracks, selectTrack]);

  const handleLoadRoomTrack = useCallback((canonicalRoom: ListeningRoom) => {
    ensureRoomTrack(canonicalRoom);
  }, [ensureRoomTrack]);

  const sendHostCommand = useCallback(async (
    command: ListeningRoomPlaybackCommand,
  ) => {
    if (!room || !isHostActive) return;
    if (hostCommandPendingRef.current || listeningRoom.isApplyingCommand) {
      recordRemoteCommand("duplicatePrevented", command.expectedRevision);
      return;
    }

    hostCommandPendingRef.current = true;
    try {
      await listeningRoom.applyCommand({ roomId: room.id, command });
    } catch {
      // The hook exposes a sanitized commandError for the shared player UI.
    } finally {
      hostCommandPendingRef.current = false;
    }
  }, [isHostActive, listeningRoom, room]);

  const sendTrackCommand = useCallback((
    kind: "track_change" | "next" | "previous",
    track: MusicTrack,
    resultingState: "playing" | "paused",
  ) => {
    if (!room || !isHostActive) return;
    const command = createListeningRoomTrackCommand(
      kind,
      room.revision,
      track,
      resultingState,
    );
    if (command) void sendHostCommand(command);
  }, [isHostActive, room, sendHostCommand]);

  const submitSources = useCallback((mode: SubmissionMode) => {
    const { parsed, invalidCount } = parseYouTubeLinks(input);
    if (parsed.length === 0) {
      setInputError("Paste one or more YouTube video or playlist links.");
      setFeedback(null);
      return;
    }

    const incoming = parsed.map((item) => trackFromParsed(item));
    const previousIndex = selectedIndex;
    const result = mode === "replace" ? replaceQueue(incoming) : appendTracks(incoming);
    if (room && mode === "append" && tracks.length > 0) selectTrack(previousIndex);
    const songWord = result.added === 1 ? "song" : "songs";
    let message = result.added > 0 ? `${result.added} ${songWord} added` : "No new songs were added";
    if (result.duplicates === 1 && incoming.length === 1) message = "This song is already in your radio";
    else if (result.duplicates > 0) message += ` · ${result.duplicates} already in your radio`;
    if (invalidCount > 0) message += ` · ${invalidCount} link${invalidCount === 1 ? "" : "s"} could not be opened`;

    setInput("");
    setInputError(invalidCount > 0 ? "Some links could not be opened." : null);
    setFeedback({ message, tone: result.added > 0 ? "success" : "notice" });
  }, [appendTracks, input, replaceQueue, room, selectTrack, selectedIndex, tracks.length]);

  const handleAppend = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSources("append");
  }, [submitSources]);

  const handleReplace = useCallback(() => {
    if (activeParticipant) return;
    submitSources("replace");
  }, [activeParticipant, submitSources]);

  const handleAddSearchResult = useCallback((searchResult: YouTubeMusicSearchResult) => {
    const previousIndex = selectedIndex;
    const result = appendTracks([musicTrackFromSearchResult(searchResult)]);
    if (tracks.length > 0) selectTrack(previousIndex);
    if (process.env.NODE_ENV === "development" && result.duplicates > 0) {
      console.debug("[music-search-client]", { queueDuplicatePreventedCount: result.duplicates });
    }
  }, [appendTracks, selectTrack, selectedIndex, tracks.length]);

  const handlePlaySearchResult = useCallback((searchResult: YouTubeMusicSearchResult) => {
    const trackToPlay = musicTrackFromSearchResult(searchResult);
    const result = appendTracks([trackToPlay]);
    if (isListenerActive) {
      if (tracks.length > 0) selectTrack(selectedIndex);
      return;
    }

    pendingPlayTrackIdRef.current = trackToPlay.id;
    selectTrack(result.selectedIndex);
    sendTrackCommand("track_change", trackToPlay, "playing");

    if (selectedTrack?.id === trackToPlay.id && controller) {
      pendingPlayTrackIdRef.current = null;
      void controller.play();
    }
    if (process.env.NODE_ENV === "development" && result.duplicates > 0) {
      console.debug("[music-search-client]", { queueDuplicatePreventedCount: result.duplicates });
    }
  }, [
    appendTracks,
    controller,
    isListenerActive,
    selectTrack,
    selectedIndex,
    selectedTrack?.id,
    sendTrackCommand,
    tracks.length,
  ]);

  const handleTrackSelection = useCallback((
    index: number,
    kind: "track_change" | "next" | "previous" = "track_change",
    forcePlaying = false,
  ) => {
    if (isListenerActive || index === selectedIndex) return;
    if (
      room
      && isHostActive
      && (hostCommandPendingRef.current || listeningRoom.isApplyingCommand)
    ) {
      recordRemoteCommand("duplicatePrevented", room.revision);
      return;
    }
    const destination = tracks[index];
    if (!destination || destination.unavailable) return;
    const resultingState = forcePlaying || isPlaying ? "playing" : "paused";
    selectTrack(index);
    if (resultingState === "playing") pendingPlayTrackIdRef.current = destination.id;
    sendTrackCommand(kind, destination, resultingState);
  }, [
    isHostActive,
    isListenerActive,
    isPlaying,
    listeningRoom.isApplyingCommand,
    room,
    selectTrack,
    selectedIndex,
    sendTrackCommand,
    tracks,
  ]);

  const handlePrevious = useCallback(() => {
    handleTrackSelection(
      nextAvailableIndex(tracks, selectedIndex, -1),
      "previous",
    );
  }, [handleTrackSelection, selectedIndex, tracks]);

  const handleNext = useCallback((forcePlaying = false) => {
    handleTrackSelection(
      nextAvailableIndex(tracks, selectedIndex, 1),
      "next",
      forcePlaying,
    );
  }, [handleTrackSelection, selectedIndex, tracks]);

  const handlePlayPause = useCallback(() => {
    if (!controller || isListenerActive) return;
    if (
      room
      && isHostActive
      && (hostCommandPendingRef.current || listeningRoom.isApplyingCommand)
    ) {
      recordRemoteCommand("duplicatePrevented", room.revision);
      return;
    }
    const currentTime = controller.getCurrentTime();
    const positionSeconds = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
    if (isPlaying) {
      controller.pause();
      if (room && isHostActive) {
        void sendHostCommand({
          kind: "pause",
          expectedRevision: room.revision,
          positionSeconds,
        });
      }
      return;
    }

    void controller.play();
    if (room && isHostActive) {
      void sendHostCommand({
        kind: "play",
        expectedRevision: room.revision,
        positionSeconds,
      });
    }
  }, [controller, isHostActive, isListenerActive, isPlaying, listeningRoom.isApplyingCommand, room, sendHostCommand]);

  const handleSeekCommit = useCallback((positionSeconds: number) => {
    if (!controller || isListenerActive) return;
    if (
      room
      && isHostActive
      && (hostCommandPendingRef.current || listeningRoom.isApplyingCommand)
    ) {
      recordRemoteCommand("duplicatePrevented", room.revision);
      return;
    }
    const committedPosition = Number.isFinite(positionSeconds) && positionSeconds >= 0
      ? positionSeconds
      : 0;
    controller.seekTo(committedPosition);
    if (room && isHostActive) {
      void sendHostCommand({
        kind: "seek",
        expectedRevision: room.revision,
        positionSeconds: committedPosition,
        resultingState: isPlaying ? "playing" : "paused",
      });
    }
  }, [controller, isHostActive, isListenerActive, isPlaying, listeningRoom.isApplyingCommand, room, sendHostCommand]);

  const handleListenerReady = useCallback(() => {
    if (!room || !isListenerActive) return;
    recordRemoteCommand("ready", room.revision);
    ensureRoomTrack(room);
    setReadyRoomId(room.id);
    activeCommandTokenRef.current += 1;
  }, [ensureRoomTrack, isListenerActive, room]);

  const handleAutoplayRecovery = useCallback(() => {
    if (!room || !controller || !isListenerActive) return;
    setReadyRoomId(room.id);
    ensureRoomTrack(room);
    const source = musicSourceFromListeningRoom(room);
    if (!source) return;
    controller.loadSource(source);
    if (!controller.isReady() || controller.getCurrentVideoId() !== room.videoId) {
      latestCanonicalRevisionRef.current = -1;
      lastAppliedPlayerRevisionRef.current = Math.min(
        lastAppliedPlayerRevisionRef.current,
        room.revision - 1,
      );
      activeCommandTokenRef.current += 1;
      return;
    }

    controller.seekTo(room.positionSeconds);
    if (room.playbackState === "playing") void controller.play();
    else controller.pause();
    lastAppliedPlayerRevisionRef.current = room.revision;
  }, [controller, ensureRoomTrack, isListenerActive, room]);

  const receiveSnapshot = useCallback((next: MusicPlayerSnapshot) => setSnapshot(next), []);
  const receiveController = useCallback((next: MusicPlayerController) => setController(next), []);

  useEffect(() => {
    const canonicalRoom = room;
    const listenerRoomId = canonicalRoom && isListenerActive ? canonicalRoom.id : null;

    if (activeListenerRoomIdRef.current !== listenerRoomId) {
      activeListenerRoomIdRef.current = listenerRoomId;
      latestCanonicalRevisionRef.current = -1;
      lastAppliedPlayerRevisionRef.current = -1;
      activeCommandTokenRef.current += 1;
    }

    if (!canonicalRoom || !isListenerActive) return;

    if (canonicalRoom.revision < latestCanonicalRevisionRef.current) {
      recordRemoteCommand("duplicatePrevented", canonicalRoom.revision);
      return;
    }

    if (canonicalRoom.revision > latestCanonicalRevisionRef.current) {
      if (latestCanonicalRevisionRef.current > lastAppliedPlayerRevisionRef.current) {
        recordRemoteCommand("pendingReplaced", canonicalRoom.revision);
      }
      latestCanonicalRevisionRef.current = canonicalRoom.revision;
      activeCommandTokenRef.current += 1;
    }

    if (
      !listenerReady
      || !controller
      || canonicalRoom.revision <= lastAppliedPlayerRevisionRef.current
      || canonicalRoom.revision !== latestCanonicalRevisionRef.current
    ) {
      return;
    }

    const source = musicSourceFromListeningRoom(canonicalRoom);
    if (!source || !canonicalRoom.videoId) return;

    const localTrack = musicTrackFromListeningRoom(canonicalRoom);
    if (!localTrack) return;
    if (trackSourceKey(selectedTrack) !== trackSourceKey(localTrack)) {
      ensureRoomTrack(canonicalRoom);
      return;
    }

    controller.loadSource(source);
    if (
      !controller.isReady()
      || controller.getCurrentVideoId() !== canonicalRoom.videoId
      || (canonicalRoom.playbackState === "playing" && snapshot.autoplayBlocked)
    ) {
      return;
    }

    const token = activeCommandTokenRef.current;
    const revision = canonicalRoom.revision;
    controller.seekTo(canonicalRoom.positionSeconds);

    const finish = () => {
      if (
        token !== activeCommandTokenRef.current
        || latestCanonicalRevisionRef.current !== revision
      ) {
        return;
      }
      lastAppliedPlayerRevisionRef.current = revision;
      recordRemoteCommand("applied", revision);
    };

    if (canonicalRoom.playbackState === "playing") {
      void controller.play().then(finish);
    } else {
      controller.pause();
      finish();
    }
  }, [
    controller,
    ensureRoomTrack,
    isListenerActive,
    listenerReady,
    room,
    selectedTrack,
    snapshot.autoplayBlocked,
    snapshot.sourceKey,
    snapshot.state,
    snapshot.videoData?.videoId,
  ]);

  useEffect(() => {
    const playlistId = selectedTrack?.playlistId;
    const videoIds = snapshot.playlistVideoIds;
    if (!playlistId || selectedTrack.videoId || !videoIds?.length) return;
    expandPlaylist(playlistId, playlistTracks(playlistId, videoIds), snapshot.playlistIndex ?? 0);
  }, [expandPlaylist, selectedTrack, snapshot.playlistIndex, snapshot.playlistVideoIds]);

  useEffect(() => {
    const videoId = snapshot.videoData?.videoId;
    if (!videoId) return;
    if (selectedTrack?.videoId === videoId && selectedTrack.metadataStatus === "provided") return;
    updateTrackMetadata(videoId, {
      title: snapshot.videoData?.title,
      artist: snapshot.videoData?.author,
    });
  }, [selectedTrack, snapshot.videoData, updateTrackMetadata]);

  useEffect(() => {
    const pendingTrackId = pendingPlayTrackIdRef.current;
    if (!pendingTrackId || !controller || selectedTrack?.id !== pendingTrackId) return;
    if (snapshot.sourceKey !== trackSourceKey(selectedTrack)) return;
    if (snapshot.state !== "ready" && snapshot.state !== "paused") return;
    pendingPlayTrackIdRef.current = null;
    void controller.play();
  }, [controller, selectedTrack, snapshot.sourceKey, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "error" || !selectedTrack || snapshot.sourceKey !== trackSourceKey(selectedTrack)) return;
    markUnavailable(selectedTrack.id);
  }, [markUnavailable, selectedTrack, snapshot.sourceKey, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "ended" || !selectedTrack || !hasNext) return;
    if (handledEndedTrackRef.current === selectedTrack.id) return;
    if (isListenerActive) return;
    handledEndedTrackRef.current = selectedTrack.id;
    handleNext(true);
  }, [handleNext, hasNext, isListenerActive, selectedTrack, snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== "ended") handledEndedTrackRef.current = null;
  }, [snapshot.state]);

  const playerSource = selectedTrack?.source ?? null;
  const orbitTracks = isListenerActive ? (selectedTrack ? [selectedTrack] : []) : tracks;
  const orbitSelectedIndex = isListenerActive ? 0 : selectedIndex;
  const queueStatus = useMemo(
    () => `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`,
    [tracks.length],
  );

  return (
    <>
      {tracks.length > 0 && (
        <OrbitingTrackCarousel
          tracks={orbitTracks}
          selectedIndex={orbitSelectedIndex}
          playingTrackId={isPlaying ? selectedTrack?.id ?? null : null}
          onSelectedIndexChange={handleTrackSelection}
          onPrevious={handlePrevious}
          onNext={() => handleNext()}
          hasPrevious={!isListenerActive && hasPrevious}
          hasNext={!isListenerActive && hasNext}
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
            listeningRoom={listeningRoom}
            realtimeStatus={realtime.status}
            partnerPresence={realtime.partnerPresence}
            listenerReady={listenerReady}
            listenerBlocked={listenerBlocked}
            sharedControlsLocked={isListenerActive}
            relationshipId={relationshipContext?.relationshipId}
            relationshipLoading={relationshipContextQuery.isPending}
            onLoadRoomTrack={handleLoadRoomTrack}
            onListenerReady={handleListenerReady}
            onAutoplayRecovery={handleAutoplayRecovery}
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
            onAddSearchResult={handleAddSearchResult}
            onPlaySearchResult={handlePlaySearchResult}
            onSelectTrack={handleTrackSelection}
            onRemoveTrack={removeTrack}
            onClearQueue={clearQueue}
            onPrevious={handlePrevious}
            onNext={() => handleNext()}
            onPlayPause={handlePlayPause}
            onSeekCommit={handleSeekCommit}
            sharedControlPending={listeningRoom.isApplyingCommand}
            sharedControlError={listeningRoom.commandError}
            onClose={onClose}
          />,
          document.body,
        )}
    </>
  );
}