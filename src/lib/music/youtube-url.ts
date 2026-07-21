import type { ParsedYouTubeUrl } from "@/types/music";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

function isSafeIdentifier(value: string | null) {
  return Boolean(value && /^[A-Za-z0-9_-]{6,}$/.test(value));
}

export function parseYouTubeUrl(value: string): ParsedYouTubeUrl {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return { kind: "invalid" };

    const playlistId = url.searchParams.get("list");
    const isShortHost = host.endsWith("youtu.be");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const videoId = isShortHost
      ? pathParts[0]
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : ["shorts", "embed"].includes(pathParts[0] ?? "")
          ? pathParts[1]
          : undefined;

    if (playlistId && isSafeIdentifier(playlistId)) {
      return isSafeIdentifier(videoId ?? null)
        ? { kind: "youtube-playlist", playlistId, videoId: videoId! }
        : { kind: "youtube-playlist", playlistId };
    }

    return isSafeIdentifier(videoId ?? null)
      ? { kind: "youtube-video", videoId: videoId! }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}