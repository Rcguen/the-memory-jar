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
  title: string;
  artist?: string;
  artworkUrl?: string;
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
};

export type MusicPlayerController = {
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  previous: () => void;
  next: () => void;
};