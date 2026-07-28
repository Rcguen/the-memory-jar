"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  normalizeYouTubeSearchQuery,
  validateYouTubeSearchQuery,
} from "@/lib/music/youtube-search";
import type {
  YouTubeMusicSearchErrorCode,
  YouTubeMusicSearchResponse,
} from "@/types/music";

const SEARCH_STALE_TIME = 12 * 60 * 60 * 1000;
const SEARCH_GC_TIME = 24 * 60 * 60 * 1000;

class MusicSearchClientError extends Error {
  constructor(
    public readonly code: YouTubeMusicSearchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MusicSearchClientError";
  }
}

function isSearchResponse(value: unknown): value is YouTubeMusicSearchResponse {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  const response = value as Record<string, unknown>;
  if (response.ok === true) {
    return typeof response.query === "string"
      && Array.isArray(response.results)
      && typeof response.cached === "boolean";
  }
  return response.ok === false
    && typeof response.code === "string"
    && typeof response.message === "string";
}

async function fetchYouTubeMusicSearch(query: string) {
  const params = new URLSearchParams({ q: query });
  let response: Response;
  try {
    response = await fetch(`/api/music/youtube/search?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new MusicSearchClientError(
      "UPSTREAM_UNAVAILABLE",
      "Search could not reach YouTube. Try again in a moment.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!isSearchResponse(payload)) {
    throw new MusicSearchClientError(
      "UPSTREAM_UNAVAILABLE",
      "Search could not reach YouTube. Try again in a moment.",
    );
  }
  if (!payload.ok) {
    throw new MusicSearchClientError(payload.code, payload.message);
  }
  return payload;
}

export function useYouTubeMusicSearch() {
  const [input, setInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["music-youtube-search", submittedQuery ?? ""],
    queryFn: () => fetchYouTubeMusicSearch(submittedQuery ?? ""),
    enabled: Boolean(submittedQuery),
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => (
      failureCount < 1
      && error instanceof MusicSearchClientError
      && error.code === "UPSTREAM_UNAVAILABLE"
    ),
  });

  const updateInput = useCallback((value: string) => {
    setInput(value);
    setValidationMessage(null);
  }, []);

  const submit = useCallback(() => {
    const validation = validateYouTubeSearchQuery(input);
    if (!validation.ok) {
      setValidationMessage(validation.message);
      return false;
    }

    const normalized = normalizeYouTubeSearchQuery(validation.query);
    if (normalized === submittedQuery) {
      if (query.isFetching) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[music-search-client]", { duplicateSubmitPreventedCount: 1 });
        }
        return false;
      }
      if (query.isError) void query.refetch();
      return true;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[music-search-client]", { searchSubmitCount: 1 });
    }
    setValidationMessage(null);
    setSubmittedQuery(normalized);
    return true;
  }, [input, query, submittedQuery]);

  const clear = useCallback(() => {
    setInput("");
    setSubmittedQuery(null);
    setValidationMessage(null);
  }, []);

  const requestError = query.error instanceof MusicSearchClientError
    ? query.error
    : null;

  return {
    input,
    updateInput,
    submittedQuery,
    submit,
    clear,
    results: query.data?.results ?? [],
    cached: query.data?.cached ?? false,
    isPending: query.isFetching,
    hasSearched: Boolean(submittedQuery),
    errorCode: requestError?.code ?? null,
    errorMessage: validationMessage ?? requestError?.message ?? null,
  };
}