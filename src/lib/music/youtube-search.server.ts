import "server-only";

import { youtubeArtworkCandidates } from "@/lib/music/youtube-url";
import type {
  YouTubeMusicSearchErrorCode,
  YouTubeMusicSearchResult,
} from "@/types/music";

const SEARCH_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;

type SearchCacheEntry = {
  expiresAt: number;
  results: YouTubeMusicSearchResult[];
};

type SearchOutcome = {
  results: YouTubeMusicSearchResult[];
  cached: boolean;
  duplicatesRemoved: number;
};

const resultCache = new Map<string, SearchCacheEntry>();
const inFlightSearches = new Map<string, Promise<SearchOutcome>>();

export class YouTubeSearchServiceError extends Error {
  constructor(
    public readonly code: YouTubeMusicSearchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "YouTubeSearchServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const numeric = Number(code);
      return Number.isInteger(numeric) && numeric > 0 && numeric <= 0x10ffff
        ? String.fromCodePoint(numeric)
        : "";
    })
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeThumbnailUrl(value: unknown, videoId: string): string {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && url.hostname === "i.ytimg.com") {
        return url.toString();
      }
    } catch {
      // Use the deterministic YouTube thumbnail fallback below.
    }
  }
  return youtubeArtworkCandidates(videoId)[0] ?? "";
}

function sanitizeSearchResults(payload: unknown): {
  results: YouTubeMusicSearchResult[];
  duplicatesRemoved: number;
} {
  const items = isRecord(payload) && Array.isArray(payload.items)
    ? payload.items
    : [];
  const results: YouTubeMusicSearchResult[] = [];
  const seen = new Set<string>();
  let duplicatesRemoved = 0;

  for (const item of items) {
    if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) continue;
    const videoId = typeof item.id.videoId === "string" ? item.id.videoId : "";
    if (!VIDEO_ID_PATTERN.test(videoId)) continue;
    if (seen.has(videoId)) {
      duplicatesRemoved += 1;
      continue;
    }

    const title = safeText(item.snippet.title, 180);
    const channelTitle = safeText(item.snippet.channelTitle, 100);
    if (!title || !channelTitle) continue;

    const thumbnails = isRecord(item.snippet.thumbnails)
      ? item.snippet.thumbnails
      : {};
    const preferredThumbnail = ["high", "medium", "default"]
      .map((key) => thumbnails[key])
      .find((thumbnail) => isRecord(thumbnail) && typeof thumbnail.url === "string");
    const thumbnailUrl = safeThumbnailUrl(
      isRecord(preferredThumbnail) ? preferredThumbnail.url : undefined,
      videoId,
    );
    const publishedAt = typeof item.snippet.publishedAt === "string"
      && Number.isFinite(Date.parse(item.snippet.publishedAt))
      ? item.snippet.publishedAt
      : undefined;

    seen.add(videoId);
    results.push({
      videoId,
      title,
      channelTitle,
      thumbnailUrl,
      ...(publishedAt ? { publishedAt } : {}),
    });
  }

  return { results, duplicatesRemoved };
}

function quotaExceeded(payload: unknown): boolean {
  if (!isRecord(payload) || !isRecord(payload.error) || !Array.isArray(payload.error.errors)) {
    return false;
  }
  return payload.error.errors.some((entry) => {
    if (!isRecord(entry) || typeof entry.reason !== "string") return false;
    return ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(entry.reason);
  });
}

function pruneExpiredCache(now: number) {
  for (const [key, entry] of resultCache) {
    if (entry.expiresAt <= now) resultCache.delete(key);
  }
  while (resultCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = resultCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    resultCache.delete(oldestKey);
  }
}

async function requestYouTubeSearch(query: string): Promise<SearchOutcome> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) {
    throw new YouTubeSearchServiceError(
      "NOT_CONFIGURED",
      "Music search has not been connected yet.",
    );
  }

  const url = new URL(YOUTUBE_SEARCH_ENDPOINT);
  url.search = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "8",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    safeSearch: "moderate",
    key: apiKey,
  }).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new YouTubeSearchServiceError(
      "UPSTREAM_UNAVAILABLE",
      "Search could not reach YouTube. Try again in a moment.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 429 || (response.status === 403 && quotaExceeded(payload))) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[music-search-server]", { quotaErrorCount: 1 });
    }
    throw new YouTubeSearchServiceError(
      "QUOTA_EXCEEDED",
      "Song search is resting for now. Paste a YouTube link instead.",
    );
  }
  if (!response.ok) {
    throw new YouTubeSearchServiceError(
      "UPSTREAM_UNAVAILABLE",
      "Search could not reach YouTube. Try again in a moment.",
    );
  }

  const sanitized = sanitizeSearchResults(payload);
  if (process.env.NODE_ENV === "development") {
    console.debug("[music-search-server]", {
      upstreamRequestCount: 1,
      resultCount: sanitized.results.length,
      duplicateRemovedCount: sanitized.duplicatesRemoved,
    });
  }
  return {
    results: sanitized.results,
    cached: false,
    duplicatesRemoved: sanitized.duplicatesRemoved,
  };
}

export async function searchYouTubeMusic(query: string): Promise<SearchOutcome> {
  const now = Date.now();
  const cached = resultCache.get(query);
  if (cached && cached.expiresAt > now) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[music-search-server]", { normalizedCacheHitCount: 1 });
    }
    return { results: cached.results, cached: true, duplicatesRemoved: 0 };
  }

  const activeSearch = inFlightSearches.get(query);
  if (activeSearch) {
    const outcome = await activeSearch;
    return { ...outcome, cached: true };
  }

  pruneExpiredCache(now);
  const request = requestYouTubeSearch(query).then((outcome) => {
    resultCache.set(query, {
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      results: outcome.results,
    });
    return outcome;
  });
  inFlightSearches.set(query, request);

  try {
    return await request;
  } finally {
    inFlightSearches.delete(query);
  }
}