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