"use client";

import { useMemo, useState } from "react";
import { Check, Music2, Play, Plus } from "lucide-react";
import { youtubeArtworkCandidates } from "@/lib/music/youtube-url";
import type { YouTubeMusicSearchResult } from "@/types/music";

export function MusicSearchResult({
  result,
  queued,
  onAdd,
  onPlayNow,
}: {
  result: YouTubeMusicSearchResult;
  queued: boolean;
  onAdd: (result: YouTubeMusicSearchResult) => void;
  onPlayNow: (result: YouTubeMusicSearchResult) => void;
}) {
  const candidates = useMemo(() => [
    ...new Set([
      result.thumbnailUrl,
      ...youtubeArtworkCandidates(result.videoId),
    ].filter(Boolean)),
  ], [result.thumbnailUrl, result.videoId]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const artwork = candidates[candidateIndex];
  const publishedYear = result.publishedAt
    ? new Date(result.publishedAt).getUTCFullYear()
    : null;

  return (
    <li className="music-search-result">
      <div className="music-search-result__thumbnail" aria-hidden="true">
        {artwork ? (
          // YouTube thumbnails are external public metadata and keep their native aspect ratio.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artwork}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setCandidateIndex((current) => current + 1)}
          />
        ) : (
          <Music2 aria-hidden="true" />
        )}
      </div>
      <div className="music-search-result__copy">
        <h4>{result.title}</h4>
        <p>
          <span>{result.channelTitle}</span>
          {publishedYear ? <span aria-hidden="true">{publishedYear}</span> : null}
        </p>
      </div>
      <div className="music-search-result__actions">
        <button
          type="button"
          className="music-search-result__play focus-ring-premium"
          onClick={() => onPlayNow(result)}
          aria-label={"Play " + result.title + " now"}
        >
          <Play fill="currentColor" aria-hidden="true" />
          <span>Play now</span>
        </button>
        <button
          type="button"
          className="music-search-result__add focus-ring-premium"
          onClick={() => onAdd(result)}
          disabled={queued}
          aria-label={queued ? result.title + " is already in queue" : "Add " + result.title + " to queue"}
        >
          {queued ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
          <span>{queued ? "In queue" : "Add"}</span>
        </button>
      </div>
    </li>
  );
}