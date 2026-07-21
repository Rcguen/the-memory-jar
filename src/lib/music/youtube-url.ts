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

export function parseYouTubeLinks(value: string) {
  const links = value
    .split(/[,\n]+/)
    .map((link) => link.trim())
    .filter(Boolean);

  const parsed: Exclude<ParsedYouTubeUrl, { kind: "invalid" }>[] = [];
  let invalidCount = 0;

  for (const link of links) {
    const result = parseYouTubeUrl(link);
    if (result.kind === "invalid") invalidCount += 1;
    else parsed.push(result);
  }

  return { parsed, invalidCount };
}

export function youtubeArtworkCandidates(videoId?: string): string[] {
  if (!videoId) return [];
  const base = `https://i.ytimg.com/vi/${videoId}`;
  return [
    `${base}/hqdefault.jpg`,
    `${base}/mqdefault.jpg`,
    `${base}/default.jpg`,
  ];
}