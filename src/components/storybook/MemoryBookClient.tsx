"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorybookMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { BookLayout } from "./BookLayout";
import { BookPageData, BookPageLayout } from "@/types/storybook";
import { generateStoryChapters } from "@/lib/helpers/story-generator";
import { useRouter } from "next/navigation";

const STORYBOOK_PREFETCH_THRESHOLD = 6;

export function MemoryBookClient() {
  const router = useRouter();
  const { data: relationship } = useRelationshipContext();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [visiblePageCount, setVisiblePageCount] = useState(1);
  const lastPrefetchCountRef = useRef<number | null>(null);
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useStorybookMemories();

  const memories = useMemo(() => data?.pages.flatMap((page) => page.memories) || [], [data]);

  const bookData = useMemo(() => {
    if (memories.length === 0) return null;

    const chapters = generateStoryChapters(memories, relationship?.startDate);
    const pages: BookPageData[] = [];
    let pageNumber = 1;

    for (const chapter of chapters) {
      for (const memory of chapter.memories) {
        let layout: BookPageLayout = "text_only";

        if (memory.type === "photo") {
          layout = memory.content ? "photo_with_caption" : "full_photo";
        } else if (memory.type === "video") {
          layout = "video";
        } else if (memory.type === "voice") {
          layout = "voice";
        } else if (memory.type === "letter") {
          layout = "letter";
        }

        if (memory.unlock_at) {
          layout = "capsule";
        }

        pages.push({
          id: `${chapter.id}-${memory.id}`,
          memory,
          layout,
          pageNumber,
          chapterTitle: chapter.title,
        });
        pageNumber += 1;
      }
    }

    return pages;
  }, [memories, relationship?.startDate]);

  const loadedPageCount = bookData?.length ?? 0;
  const remainingLoadedPages = loadedPageCount - (currentPageIndex + visiblePageCount);

  const maybePrefetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || loadedPageCount === 0) return;
    if (remainingLoadedPages > STORYBOOK_PREFETCH_THRESHOLD) return;
    if (lastPrefetchCountRef.current === loadedPageCount) return;

    lastPrefetchCountRef.current = loadedPageCount;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, loadedPageCount, remainingLoadedPages]);

  useEffect(() => {
    void maybePrefetchNextPage();
  }, [maybePrefetchNextPage]);

  const handleReaderPositionChange = useCallback((pageIndex: number, renderedPageCount: number) => {
    setCurrentPageIndex(pageIndex);
    setVisiblePageCount(renderedPageCount);
  }, []);

  const handleRetryPrefetch = useCallback(async () => {
    lastPrefetchCountRef.current = null;
    await fetchNextPage();
  }, [fetchNextPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1410] gap-6" aria-label="Loading your storybook">
        <div
          className="relative h-32 w-24 animate-pulse rounded-r-lg"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(160deg, #7c4a1e 0%, #4a2208 100%)',
            boxShadow: '4px 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <div className="absolute inset-0 rounded-r-lg" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 20%)' }} />
          <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l" style={{ background: 'rgba(235,210,160,0.15)' }} />
        </div>
        <p className="font-cormorant text-lg text-amber-200/50 tracking-wide">Opening your storybook…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1410] px-6">
        <div className="text-center max-w-sm">
          <p aria-hidden="true" className="mb-5 text-3xl opacity-40">📖</p>
          <h2 className="font-cormorant text-2xl text-amber-200/75 mb-3">
            We couldn&apos;t open your storybook.
          </h2>
          <p className="text-sm text-amber-100/35 leading-relaxed">
            {error instanceof Error ? error.message : "Something went wrong. Please try again in a moment."}
          </p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-8 px-6 py-2 rounded-full border border-amber-200/15 bg-amber-50/5 text-sm text-amber-200/55 hover:bg-amber-50/10 hover:text-amber-100/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!bookData || bookData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1410] px-6">
        <div className="text-center max-w-sm">
          <p aria-hidden="true" className="mb-5 text-3xl opacity-30">📖</p>
          <h2 className="font-cormorant text-2xl text-amber-200/65 mb-3">
            Your storybook is waiting.
          </h2>
          <p className="text-sm text-amber-100/35 leading-relaxed">
            Every memory you add to the jar becomes a page in your story. Start with one small moment.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-8 px-6 py-2 rounded-full border border-amber-200/15 bg-amber-50/5 text-sm text-amber-200/55 hover:bg-amber-50/10 hover:text-amber-100/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <BookLayout
      title="Our Story"
      subtitle="A collection of memories"
      dateStr={relationship?.startDate ? `EST. ${new Date(relationship.startDate).getFullYear()}` : undefined}
      pages={bookData}
      hasMorePages={Boolean(hasNextPage)}
      isFetchingMore={isFetchingNextPage}
      fetchMoreError={isFetchNextPageError}
      onRetryFetchMore={handleRetryPrefetch}
      onPageChange={handleReaderPositionChange}
      onClose={() => router.back()}
    />
  );
}

