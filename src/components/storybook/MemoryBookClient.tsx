"use client";

import React, { useMemo, useEffect } from "react";
import { useStorybookMemories } from "@/hooks/useMemoryData";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { BookLayout } from "./BookLayout";
import { BookPageData, BookPageLayout } from "@/types/storybook";
import { generateStoryChapters } from "@/lib/helpers/story-generator";

import { useRouter } from "next/navigation";

export function MemoryBookClient() {
  const router = useRouter();
  const { data: relationship } = useRelationshipContext();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useStorybookMemories();

  const memories = useMemo(() => {
    return data?.pages.flatMap((page) => page.memories) || [];
  }, [data]);

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookData = useMemo(() => {
    if (!memories || memories.length === 0) return null;

    const chapters = generateStoryChapters(memories, relationship?.startDate);
    
    // Flatten chapters into pages
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

        // Check if capsule
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
        pageNumber++;
      }
    }

    return pages;
  }, [memories, relationship]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (!bookData || bookData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-50">📖</div>
          <h2 className="text-2xl font-serif text-amber-200/60 mb-4">
            Your storybook is waiting for its first memory.
          </h2>
          <p className="text-white/40">
            Start adding memories to your jar to see your relationship storybook come to life.
          </p>
          <button 
            onClick={() => router.back()}
            className="mt-8 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
          >
            Go Back
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
      onClose={() => router.back()}
    />
  );
}
