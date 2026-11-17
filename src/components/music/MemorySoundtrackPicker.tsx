"use client";

import { useState } from "react";
import { Check, Disc3, Link2, Music2, Plus, Search, X } from "lucide-react";
import { useYouTubeMusicSearch } from "@/hooks/useYouTubeMusicSearch";
import { parseYouTubeUrl, youtubeArtworkCandidates } from "@/lib/music/youtube-url";
import type { MemorySoundtrack } from "@/types/memory";
import type { YouTubeMusicSearchResult } from "@/types/music";
import { cn } from "@/lib/utils";

function soundtrackFromSearchResult(result: YouTubeMusicSearchResult): MemorySoundtrack {
  return {
    source_kind: "youtube_video",
    video_id: result.videoId,
    playlist_id: null,
    playlist_index: null,
    title: result.title.slice(0, 200),
    artist: result.channelTitle.slice(0, 160) || null,
    artwork_url: result.thumbnailUrl || youtubeArtworkCandidates(result.videoId)[0] || null,
  };
}

function soundtrackFromLink(value: string): MemorySoundtrack | null {
  const parsed = parseYouTubeUrl(value);
  if (parsed.kind === "invalid") return null;

  if (parsed.kind === "youtube-video") {
    return {
      source_kind: "youtube_video",
      video_id: parsed.videoId,
      playlist_id: null,
      playlist_index: null,
      title: "YouTube soundtrack",
      artist: "YouTube",
      artwork_url: youtubeArtworkCandidates(parsed.videoId)[0] || null,
    };
  }

  return {
    source_kind: "youtube_playlist",
    video_id: parsed.videoId ?? null,
    playlist_id: parsed.playlistId,
    playlist_index: 0,
    title: "YouTube playlist",
    artist: "YouTube",
    artwork_url: youtubeArtworkCandidates(parsed.videoId)[0] || null,
  };
}

function SoundtrackArtwork({
  soundtrack,
  className,
}: {
  soundtrack: MemorySoundtrack;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-900 text-stone-200",
        className,
      )}
      aria-hidden="true"
    >
      {soundtrack.artwork_url ? (
        // YouTube artwork is public metadata and is not private memory media.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={soundtrack.artwork_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Disc3 className="h-5 w-5" />
      )}
    </span>
  );
}

export function MemorySoundtrackPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: MemorySoundtrack | null;
  onChange: (soundtrack: MemorySoundtrack | null) => void;
  disabled?: boolean;
}) {
  const search = useYouTubeMusicSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const selectSoundtrack = (soundtrack: MemorySoundtrack) => {
    onChange(soundtrack);
    setIsOpen(false);
    setLink("");
    setLinkError(null);
  };

  const submitSearch = () => {
    search.submit();
  };

  const submitLink = () => {
    const soundtrack = soundtrackFromLink(link);
    if (!soundtrack) {
      setLinkError("Paste a valid YouTube video or playlist link.");
      return;
    }
    selectSoundtrack(soundtrack);
  };

  return (
    <section
      className="rounded-xl border border-[var(--divider)] bg-[var(--surface-base)] p-4"
      aria-labelledby="memory-soundtrack-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            id="memory-soundtrack-title"
            className="flex items-center gap-2 font-inter text-xs font-medium text-[var(--text-secondary)]"
          >
            <Music2 className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
            Memory soundtrack
          </p>
          <p className="mt-1 font-inter text-xs leading-relaxed text-[var(--text-tertiary)]">
            Add a quiet soundtrack for this memory
          </p>
        </div>
        {!value && (
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            disabled={disabled}
            aria-expanded={isOpen}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] px-4 font-inter text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {isOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {isOpen ? "Close" : "Add music"}
          </button>
        )}
      </div>

      {value && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--accent-primary)]/35 bg-[var(--surface-raised)] p-2.5 shadow-sm">
          <SoundtrackArtwork soundtrack={value} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-cormorant text-lg font-semibold leading-tight text-[var(--text-primary)]">
              {value.title}
            </p>
            <p className="mt-0.5 truncate font-inter text-[11px] text-[var(--text-tertiary)]">
              {value.artist || (value.source_kind === "youtube_playlist" ? "YouTube playlist" : "YouTube")}
            </p>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            <Check className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Soundtrack selected</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)] disabled:opacity-50"
            aria-label="Remove soundtrack"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {isOpen && !value && (
        <div className="mt-4 border-t border-[var(--divider)] pt-4">
          <div role="search">
            <label htmlFor="memory-soundtrack-search" className="font-inter text-xs font-medium text-[var(--text-secondary)]">
              Find a song
            </label>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <input
                  id="memory-soundtrack-search"
                  type="search"
                  value={search.input}
                  onChange={(event) => search.updateInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitSearch();
                    }
                  }}
                  placeholder="Song, artist, or mood"
                  autoComplete="off"
                  enterKeyHint="search"
                  maxLength={100}
                  className="h-11 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] pl-9 pr-3 font-inter text-sm text-[var(--text-primary)] outline-none focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/20"
                />
              </div>
              <button
                type="button"
                onClick={submitSearch}
                disabled={search.isPending || !search.input.trim()}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 font-inter text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-45 motion-reduce:transition-none"
              >
                {search.isPending ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {search.errorMessage && (
            <p className="mt-2 font-inter text-xs text-rose-600" role="status">
              {search.errorMessage}
            </p>
          )}

          {!search.isPending && search.results.length > 0 && (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1" aria-label="Soundtrack search results">
              {search.results.map((result) => {
                const soundtrack = soundtrackFromSearchResult(result);
                return (
                  <li key={result.videoId}>
                    <button
                      type="button"
                      onClick={() => selectSoundtrack(soundtrack)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-transparent bg-white p-2 text-left transition-colors hover:border-stone-200 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:bg-stone-950 dark:hover:border-stone-700 dark:hover:bg-stone-900"
                    >
                      <SoundtrackArtwork soundtrack={soundtrack} className="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-cormorant text-base font-semibold text-stone-900 dark:text-stone-100">
                          {result.title}
                        </span>
                        <span className="block truncate font-inter text-[11px] text-stone-500">
                          {result.channelTitle}
                        </span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="my-4 flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
            <span className="h-px flex-1 bg-[var(--divider)]" />
            or paste
            <span className="h-px flex-1 bg-[var(--divider)]" />
          </div>

          <div>
            <label htmlFor="memory-soundtrack-link" className="sr-only">YouTube video or playlist link</label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <input
                  id="memory-soundtrack-link"
                  type="url"
                  value={link}
                  onChange={(event) => {
                    setLink(event.target.value);
                    setLinkError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitLink();
                    }
                  }}
                  placeholder="Paste a YouTube link"
                  className="h-11 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] pl-9 pr-3 font-inter text-sm text-[var(--text-primary)] outline-none focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/20"
                />
              </div>
              <button
                type="button"
                onClick={submitLink}
                disabled={!link.trim()}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] px-4 font-inter text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)] disabled:opacity-45 motion-reduce:transition-none"
              >
                Add
              </button>
            </div>
            {linkError && <p className="mt-2 font-inter text-xs text-rose-600" role="status">{linkError}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

