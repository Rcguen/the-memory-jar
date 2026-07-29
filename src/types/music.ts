export type YouTubeVideoSource = {
  kind: "youtube-video";
  videoId: string;
};

export type YouTubePlaylistSource = {
  kind: "youtube-playlist-item";
  videoId?: string;
  playlistId: string;
  playlistIndex: number;
};

export type MusicSource = YouTubeVideoSource | YouTubePlaylistSource;

export type MusicTrack = {
  id: string;
  videoId?: string;
  playlistId?: string;
  playlistIndex?: number;
  title: string;
  artist?: string;
  artworkUrl: string;
  metadataStatus: "placeholder" | "current-player-data" | "provided";
  unavailable?: boolean;
  source: MusicSource;
};

export type YouTubeMusicSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt?: string;
};

export type YouTubeMusicSearchErrorCode =
  | "INVALID_QUERY"
  | "UNAUTHENTICATED"
  | "NOT_CONFIGURED"
  | "QUOTA_EXCEEDED"
  | "UPSTREAM_UNAVAILABLE";

export type YouTubeMusicSearchResponse =
  | {
      ok: true;
      query: string;
      results: YouTubeMusicSearchResult[];
      cached: boolean;
    }
  | {
      ok: false;
      code: YouTubeMusicSearchErrorCode;
      message: string;
    };

export type ParsedYouTubeUrl =
  | { kind: "youtube-video"; videoId: string }
  | { kind: "youtube-playlist"; playlistId: string; videoId?: string }
  | { kind: "invalid" };

export type MusicPlaybackState = "idle" | "ready" | "playing" | "paused" | "buffering" | "ended" | "error";

export type MusicPlayerSnapshot = {
  state: MusicPlaybackState;
  currentTime: number;
  duration: number;
  error?: string;
  sourceKey?: string;
  videoData?: {
    videoId?: string;
    title?: string;
    author?: string;
  };
  playlistVideoIds?: string[];
  playlistIndex?: number;
};

export type MusicPlayerController = {
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
};

export type ListeningRoomSourceKind = "youtube_video" | "youtube_playlist";
export type ListeningRoomPlaybackState = "idle" | "playing" | "paused" | "buffering" | "ended";
export type ListeningRoomParticipantRole = "host" | "listener";

export type ListeningRoom = {
  id: string;
  relationshipId: string;
  hostId: string;
  sourceKind: ListeningRoomSourceKind | null;
  videoId: string | null;
  playlistId: string | null;
  playlistIndex: number | null;
  playbackState: ListeningRoomPlaybackState;
  positionSeconds: number;
  revision: number;
  stateChangedAt: string;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  endedBy: string | null;
};

export type ListeningRoomParticipant = {
  roomId: string;
  profileId: string;
  role: ListeningRoomParticipantRole;
  joinedAt: string;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListeningRoomTrackSnapshot = {
  sourceKind: ListeningRoomSourceKind;
  videoId: string;
  playlistId: string | null;
  playlistIndex: number | null;
  playbackState: Exclude<ListeningRoomPlaybackState, "ended">;
  positionSeconds: number;
};

export type ListeningRoomErrorCode =
  | "NO_ACTIVE_RELATIONSHIP"
  | "ROOM_ALREADY_ACTIVE"
  | "ROOM_NOT_FOUND"
  | "ROOM_ENDED"
  | "NOT_RELATIONSHIP_MEMBER"
  | "HOST_ONLY"
  | "NOT_JOINED"
  | "INVALID_TRACK"
  | "UNKNOWN";
