import type {
  ListeningRoom,
  ListeningRoomParticipant,
  ListeningRoomPlaybackState,
  ListeningRoomSourceKind,
  ListeningRoomTrackSnapshot,
  MusicPlayerSnapshot,
  MusicTrack,
} from "@/types/music";
import { youtubeArtworkCandidates } from "./youtube-url";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNonnegativeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function asNullableNonnegativeInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function asSafeYouTubeIdentifier(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,}$/.test(value)
    ? value
    : null;
}

function asSourceKind(value: unknown): ListeningRoomSourceKind | null {
  return value === "youtube_video" || value === "youtube_playlist" ? value : null;
}

function asPlaybackState(value: unknown): ListeningRoomPlaybackState {
  return value === "playing"
    || value === "paused"
    || value === "buffering"
    || value === "ended"
    ? value
    : "idle";
}

export function mapListeningRoom(value: unknown): ListeningRoom | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = asString(row.id);
  const relationshipId = asString(row.relationship_id);
  const hostId = asString(row.host_id);
  if (!id || !relationshipId || !hostId) return null;

  return {
    id,
    relationshipId,
    hostId,
    sourceKind: asSourceKind(row.source_kind),
    videoId: asNullableString(row.video_id),
    playlistId: asNullableString(row.playlist_id),
    playlistIndex: asNullableNonnegativeInteger(row.playlist_index),
    playbackState: asPlaybackState(row.playback_state),
    positionSeconds: asNonnegativeNumber(row.position_seconds),
    revision: asNonnegativeNumber(row.revision),
    stateChangedAt: asString(row.state_changed_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    endedAt: asNullableString(row.ended_at),
    endedBy: asNullableString(row.ended_by),
  };
}

export function mapListeningRoomParticipant(value: unknown): ListeningRoomParticipant | null {
  const row = asRecord(value);
  if (!row) return null;

  const roomId = asString(row.room_id);
  const profileId = asString(row.profile_id);
  const role = row.role === "host" || row.role === "listener" ? row.role : null;
  if (!roomId || !profileId || !role) return null;

  return {
    roomId,
    profileId,
    role,
    joinedAt: asString(row.joined_at),
    leftAt: asNullableString(row.left_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function trackSourceKey(track: MusicTrack): string {
  return track.source.kind === "youtube-video"
    ? `video:${track.source.videoId}`
    : `playlist:${track.source.playlistId}:${track.source.playlistIndex}`;
}

function roomPlaybackState(snapshot: MusicPlayerSnapshot): Exclude<ListeningRoomPlaybackState, "ended"> {
  if (snapshot.state === "playing") return "playing";
  if (snapshot.state === "buffering") return "buffering";
  if (snapshot.state === "idle") return "idle";
  return "paused";
}

export function createListeningRoomSnapshot(
  track: MusicTrack | null,
  snapshot: MusicPlayerSnapshot,
): ListeningRoomTrackSnapshot | null {
  if (!track) return null;
  const videoId = asSafeYouTubeIdentifier(track.source.videoId)
    ?? asSafeYouTubeIdentifier(track.videoId);
  if (!videoId) return null;

  const snapshotMatchesTrack = snapshot.sourceKey === trackSourceKey(track);
  const playbackState = snapshotMatchesTrack ? roomPlaybackState(snapshot) : "paused";
  const positionSeconds = snapshotMatchesTrack ? asNonnegativeNumber(snapshot.currentTime) : 0;

  if (track.source.kind === "youtube-video") {
    return {
      sourceKind: "youtube_video",
      videoId,
      playlistId: null,
      playlistIndex: null,
      playbackState,
      positionSeconds,
    };
  }

  const playlistId = asSafeYouTubeIdentifier(track.source.playlistId);
  const playlistIndex = asNullableNonnegativeInteger(track.source.playlistIndex);
  if (!playlistId || playlistIndex === null) return null;

  return {
    sourceKind: "youtube_playlist",
    videoId,
    playlistId,
    playlistIndex,
    playbackState,
    positionSeconds,
  };
}

export function findLocalListeningRoomTrack(
  room: ListeningRoom,
  tracks: MusicTrack[],
): MusicTrack | null {
  if (!room.videoId) return null;
  return tracks.find((track) => {
    if (room.sourceKind === "youtube_playlist") {
      return track.videoId === room.videoId
        && track.playlistId === room.playlistId
        && track.playlistIndex === room.playlistIndex;
    }
    return track.videoId === room.videoId;
  }) ?? null;
}

export function musicTrackFromListeningRoom(room: ListeningRoom): MusicTrack | null {
  if (!room.videoId || !room.sourceKind) return null;

  if (room.sourceKind === "youtube_playlist" && room.playlistId && room.playlistIndex !== null) {
    return {
      id: `room-playlist:${room.playlistId}:${room.playlistIndex}:${room.videoId}`,
      videoId: room.videoId,
      playlistId: room.playlistId,
      playlistIndex: room.playlistIndex,
      title: "Listening room song",
      artist: "YouTube playlist",
      artworkUrl: youtubeArtworkCandidates(room.videoId)[0] ?? "",
      metadataStatus: "placeholder",
      source: {
        kind: "youtube-playlist-item",
        videoId: room.videoId,
        playlistId: room.playlistId,
        playlistIndex: room.playlistIndex,
      },
    };
  }

  return {
    id: `room-video:${room.videoId}`,
    videoId: room.videoId,
    title: "Listening room song",
    artist: "YouTube",
    artworkUrl: youtubeArtworkCandidates(room.videoId)[0] ?? "",
    metadataStatus: "placeholder",
    source: { kind: "youtube-video", videoId: room.videoId },
  };
}
