"use client";

import { useCallback, useRef, useState } from "react";
import type { MusicTrack } from "@/types/music";

type QueueMutationResult = {
  added: number;
  duplicates: number;
  selectedIndex: number;
};

function identity(track: MusicTrack) {
  if (track.videoId) return `video:${track.videoId}`;
  if (track.playlistId) return `playlist:${track.playlistId}`;
  return track.id;
}

function nearestAvailableIndex(tracks: MusicTrack[], start: number) {
  if (tracks.length === 0) return 0;
  const clamped = Math.max(0, Math.min(start, tracks.length - 1));
  if (!tracks[clamped]?.unavailable) return clamped;
  for (let distance = 1; distance < tracks.length; distance += 1) {
    const next = clamped + distance;
    if (next < tracks.length && !tracks[next]?.unavailable) return next;
    const previous = clamped - distance;
    if (previous >= 0 && !tracks[previous]?.unavailable) return previous;
  }
  return clamped;
}

export function useMusicQueue() {
  const [tracks, setTracksState] = useState<MusicTrack[]>([]);
  const [selectedIndex, setSelectedIndexState] = useState(0);
  const tracksRef = useRef<MusicTrack[]>([]);
  const selectedIndexRef = useRef(0);

  const commit = useCallback((nextTracks: MusicTrack[], nextSelectedIndex: number) => {
    const safeIndex = nearestAvailableIndex(nextTracks, nextSelectedIndex);
    tracksRef.current = nextTracks;
    selectedIndexRef.current = safeIndex;
    setTracksState(nextTracks);
    setSelectedIndexState(safeIndex);
    return safeIndex;
  }, []);

  const appendTracks = useCallback((incoming: MusicTrack[]): QueueMutationResult => {
    const current = tracksRef.current;
    const next = [...current];
    const seen = new Map(next.map((track, index) => [identity(track), index]));
    let duplicates = 0;
    let duplicateIndex = -1;

    for (const track of incoming) {
      const key = identity(track);
      const existingIndex = seen.get(key);
      if (existingIndex !== undefined) {
        duplicates += 1;
        duplicateIndex = existingIndex;
        continue;
      }
      seen.set(key, next.length);
      next.push(track);
    }

    const added = next.length - current.length;
    const nextSelection = added > 0
      ? current.length
      : incoming.length === 1 && duplicateIndex >= 0
        ? duplicateIndex
        : selectedIndexRef.current;

    const safeIndex = commit(next, nextSelection);
    return { added, duplicates, selectedIndex: safeIndex };
  }, [commit]);

  const replaceQueue = useCallback((incoming: MusicTrack[]): QueueMutationResult => {
    const next: MusicTrack[] = [];
    const seen = new Set<string>();
    let duplicates = 0;

    for (const track of incoming) {
      const key = identity(track);
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      next.push(track);
    }

    const safeIndex = commit(next, 0);
    return { added: next.length, duplicates, selectedIndex: safeIndex };
  }, [commit]);

  const selectTrack = useCallback((index: number) => {
    const tracksNow = tracksRef.current;
    if (index < 0 || index >= tracksNow.length) return;
    selectedIndexRef.current = index;
    setSelectedIndexState(index);
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    const current = tracksRef.current;
    const removedIndex = current.findIndex((track) => track.id === trackId);
    if (removedIndex < 0) return;

    const next = current.filter((track) => track.id !== trackId);
    let nextIndex = selectedIndexRef.current;
    if (removedIndex < nextIndex) nextIndex -= 1;
    else if (removedIndex === nextIndex) nextIndex = Math.min(removedIndex, next.length - 1);
    commit(next, Math.max(0, nextIndex));
  }, [commit]);

  const clearQueue = useCallback(() => {
    commit([], 0);
  }, [commit]);

  const moveSelection = useCallback((direction: -1 | 1) => {
    const current = tracksRef.current;
    let index = selectedIndexRef.current + direction;
    while (index >= 0 && index < current.length) {
      if (!current[index]?.unavailable) {
        selectTrack(index);
        return index;
      }
      index += direction;
    }
    return selectedIndexRef.current;
  }, [selectTrack]);

  const expandPlaylist = useCallback((
    playlistId: string,
    expandedTracks: MusicTrack[],
    playlistIndex: number,
  ) => {
    const current = tracksRef.current;
    const placeholderIndex = current.findIndex(
      (track) => track.playlistId === playlistId && !track.videoId,
    );
    if (placeholderIndex < 0) return;

    const withoutPlaceholder = current.filter((_, index) => index !== placeholderIndex);
    const seen = new Set(withoutPlaceholder.map(identity));
    const uniqueExpanded = expandedTracks.filter((track) => {
      const key = identity(track);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const next = [
      ...withoutPlaceholder.slice(0, placeholderIndex),
      ...uniqueExpanded,
      ...withoutPlaceholder.slice(placeholderIndex),
    ];
    const selectedOffset = Math.max(0, Math.min(playlistIndex, uniqueExpanded.length - 1));
    commit(next, uniqueExpanded.length > 0 ? placeholderIndex + selectedOffset : placeholderIndex);
  }, [commit]);

  const updateTrackMetadata = useCallback((
    videoId: string,
    metadata: { title?: string; artist?: string },
  ) => {
    const current = tracksRef.current;
    let changed = false;
    const next = current.map((track) => {
      if (track.videoId !== videoId) return track;
      const title = metadata.title?.trim() || track.title;
      const artist = metadata.artist?.trim() || track.artist;
      if (title === track.title && artist === track.artist && track.metadataStatus === "current-player-data") {
        return track;
      }
      changed = true;
      return { ...track, title, artist, metadataStatus: "current-player-data" as const };
    });
    if (changed) commit(next, selectedIndexRef.current);
  }, [commit]);

  const markUnavailable = useCallback((trackId: string) => {
    const current = tracksRef.current;
    if (current.find((track) => track.id === trackId)?.unavailable) return;
    const next = current.map((track) => track.id === trackId ? { ...track, unavailable: true } : track);
    commit(next, selectedIndexRef.current);
  }, [commit]);

  const hasPrevious = tracks.slice(0, selectedIndex).some((track) => !track.unavailable);
  const hasNext = tracks.slice(selectedIndex + 1).some((track) => !track.unavailable);
  const previousTrack = useCallback(() => moveSelection(-1), [moveSelection]);
  const nextTrack = useCallback(() => moveSelection(1), [moveSelection]);

  return {
    tracks,
    selectedIndex,
    selectedTrack: tracks[selectedIndex] ?? null,
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
  };
}