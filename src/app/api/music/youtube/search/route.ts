import type { NextRequest } from "next/server";
import {
  normalizeYouTubeSearchQuery,
  validateYouTubeSearchQuery,
} from "@/lib/music/youtube-search";
import {
  searchYouTubeMusic,
  YouTubeSearchServiceError,
} from "@/lib/music/youtube-search.server";
import { createClient } from "@/lib/supabase/server";
import type {
  YouTubeMusicSearchErrorCode,
  YouTubeMusicSearchResponse,
} from "@/types/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  code: YouTubeMusicSearchErrorCode,
  message: string,
  status: number,
) {
  return Response.json(
    { ok: false, code, message } satisfies YouTubeMusicSearchResponse,
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    console.debug("[music-search-api]", { requestCount: 1 });
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return errorResponse(
      "UNAUTHENTICATED",
      "Please sign in to search for songs.",
      401,
    );
  }

  const validation = validateYouTubeSearchQuery(
    normalizeYouTubeSearchQuery(request.nextUrl.searchParams.get("q") ?? ""),
  );
  if (!validation.ok) {
    return errorResponse("INVALID_QUERY", validation.message, 400);
  }

  try {
    const outcome = await searchYouTubeMusic(validation.query);
    return Response.json(
      {
        ok: true,
        query: validation.query,
        results: outcome.results,
        cached: outcome.cached,
      } satisfies YouTubeMusicSearchResponse,
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
        },
      },
    );
  } catch (caught) {
    if (caught instanceof YouTubeSearchServiceError) {
      const status = caught.code === "NOT_CONFIGURED"
        ? 503
        : caught.code === "QUOTA_EXCEEDED"
          ? 429
          : 502;
      return errorResponse(caught.code, caught.message, status);
    }
    return errorResponse(
      "UPSTREAM_UNAVAILABLE",
      "Search could not reach YouTube. Try again in a moment.",
      502,
    );
  }
}