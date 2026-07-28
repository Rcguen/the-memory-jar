import type {
  MusicTrack,
  YouTubeMusicSearchResult,
} from "@/types/music";

export const YOUTUBE_SEARCH_MIN_LENGTH = 2;
export const YOUTUBE_SEARCH_MAX_LENGTH = 100;

export function normalizeYouTubeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateYouTubeSearchQuery(value: string):
  | { ok: true; query: string }
  | { ok: false; message: string } {
  const query = normalizeYouTubeSearchQuery(value);
  if (query.length < YOUTUBE_SEARCH_MIN_LENGTH) {
    return { ok: false, message: "Type a little more to begin searching." };
  }
  if (query.length > YOUTUBE_SEARCH_MAX_LENGTH) {
    return { ok: false, message: "Keep your search under 100 characters." };
  }
  return { ok: true, query };
}

export function musicTrackFromSearchResult(
  result: YouTubeMusicSearchResult,
): MusicTrack {
  return {
    id: `video:${result.videoId}`,
    videoId: result.videoId,
    title: result.title,
    artist: result.channelTitle,
    artworkUrl: result.thumbnailUrl,
    metadataStatus: "provided",
    source: { kind: "youtube-video", videoId: result.videoId },
  };
}