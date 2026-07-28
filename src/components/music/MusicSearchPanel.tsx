"use client";

import { useEffect, useMemo, useRef } from "react";
import { Search, X } from "lucide-react";
import { useYouTubeMusicSearch } from "@/hooks/useYouTubeMusicSearch";
import type {
  MusicTrack,
  YouTubeMusicSearchResult,
} from "@/types/music";
import { MusicSearchResult } from "./MusicSearchResult";

export function MusicSearchPanel({
  tracks,
  onAdd,
  onPlayNow,
  onOpenPaste,
}: {
  tracks: MusicTrack[];
  onAdd: (result: YouTubeMusicSearchResult) => void;
  onPlayNow: (result: YouTubeMusicSearchResult) => void;
  onOpenPaste: () => void;
}) {
  const search = useYouTubeMusicSearch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queuedVideoIds = useMemo(
    () => new Set(tracks.map((track) => track.videoId).filter(Boolean)),
    [tracks],
  );
  const descriptionIds = [
    "music-search-helper",
    search.errorMessage ? "music-search-error" : null,
  ].filter(Boolean).join(" ");

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search.submit();
  };

  const addResult = (result: YouTubeMusicSearchResult) => {
    onAdd(result);
    if (process.env.NODE_ENV === "development") {
      console.debug("[music-search-client]", { addCount: 1 });
    }
  };

  const playResult = (result: YouTubeMusicSearchResult) => {
    onPlayNow(result);
    if (process.env.NODE_ENV === "development") {
      console.debug("[music-search-client]", { playNowCount: 1 });
    }
  };

  return (
    <section
      id="music-panel-search"
      className="music-search-panel"
      role="tabpanel"
      aria-labelledby="music-tab-search"
      onKeyDown={(event) => {
        if (event.key === "Escape" && (search.input || search.hasSearched)) {
          event.stopPropagation();
          search.clear();
        }
      }}
    >
      <div className="music-search-panel__intro">
        <div>
          <span className="persistent-music-player__eyebrow">Find a song</span>
          <h3>Search your next little soundtrack</h3>
        </div>
        {search.hasSearched && (
          <span className="music-search-panel__query">
            {search.cached ? "Remembered" : "Found"}
          </span>
        )}
      </div>

      <form className="music-search-form" onSubmit={submit} role="search">
        <label htmlFor="music-youtube-search">Song, artist, or mood</label>
        <div className="music-search-form__field">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            id="music-youtube-search"
            type="search"
            value={search.input}
            onChange={(event) => search.updateInput(event.target.value)}
            placeholder="Search a song, artist, or mood"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={100}
            aria-invalid={Boolean(search.errorMessage)}
            aria-describedby={descriptionIds || undefined}
          />
          {search.input && (
            <button
              type="button"
              className="music-search-form__clear focus-ring-premium"
              onClick={search.clear}
              aria-label="Clear music search"
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="music-search-form__submit focus-ring-premium"
          disabled={search.isPending || !search.input.trim()}
        >
          <Search aria-hidden="true" />
          <span>{search.isPending ? "Searching..." : "Search"}</span>
        </button>
      </form>
      <p id="music-search-helper" className="music-search-helper">
        Search YouTube without leaving your little radio.
      </p>

      {search.errorMessage && (
        <div id="music-search-error" className="music-search-message" data-tone="error" role="status">
          <p>{search.errorMessage}</p>
          {search.errorCode && search.errorCode !== "INVALID_QUERY" && (
            <button type="button" onClick={onOpenPaste} className="focus-ring-premium">
              Paste a link instead
            </button>
          )}
        </div>
      )}

      {search.isPending ? (
        <div className="music-search-skeletons" aria-label="Searching YouTube" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="music-search-skeleton" key={index} aria-hidden="true">
              <span />
              <span><i /><i /></span>
            </div>
          ))}
        </div>
      ) : search.hasSearched && !search.errorMessage ? (
        search.results.length > 0 ? (
          <>
            <div className="music-search-results__summary">
              <span>Results for &quot;{search.submittedQuery}&quot;</span>
              <span>{search.results.length} found</span>
            </div>
            <ol className="music-search-results" aria-label={`YouTube results for ${search.submittedQuery}`}>
              {search.results.map((result) => (
                <MusicSearchResult
                  key={result.videoId}
                  result={result}
                  queued={queuedVideoIds.has(result.videoId)}
                  onAdd={addResult}
                  onPlayNow={playResult}
                />
              ))}
            </ol>
          </>
        ) : (
          <div className="music-search-message" role="status">
            <p>No songs found for this search.</p>
            <span>Try another title, artist, or mood.</span>
          </div>
        )
      ) : !search.errorMessage ? (
        <div className="music-search-empty">
          <Search aria-hidden="true" />
          <p>Try a song title, artist, or a mood.</p>
          <span>Nothing is searched until you press Search.</span>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {!search.isPending && search.hasSearched && !search.errorMessage
          ? `${search.results.length} song results found.`
          : search.isPending
            ? "Searching for songs."
            : ""}
      </p>
    </section>
  );
}
