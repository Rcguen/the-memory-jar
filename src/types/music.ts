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