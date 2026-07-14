"use client";

import React from "react";
import { useQueries } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";

import { BookPageData } from "@/types/storybook";
import { PhotoGallery } from "@/components/viewer/PhotoGallery";
import { AudioPlayer } from "@/components/viewer/AudioPlayer";
import { VideoPlayer } from "@/components/viewer/VideoPlayer";

interface BookPageProps {
  pageData: BookPageData;
  isLeftPage: boolean;
}

export function BookPage({ pageData, isLeftPage }: BookPageProps) {
  const { memory, layout } = pageData;
  const attachments = memory.attachments || [];
  const attachmentUrlQueries = useQueries({
    queries: attachments.map((attachment) => ({
      queryKey: ["signedAttachmentUrl", attachment.id, attachment.url],
      queryFn: () => memoryService.getAttachmentUrlAsync(attachment.file_type, attachment.url),
      staleTime: 1000 * 60 * 30,
    })),
  });
  const attachmentUrlsById = new Map(
    attachments.map((attachment, index) => [attachment.id, attachmentUrlQueries[index]?.data]),
  );
  const getAttachmentUrl = (attachment: typeof attachments[number]) => attachmentUrlsById.get(attachment.id);
  
  // Render based on layout
  const renderContent = () => {
    switch (layout) {
      case "full_photo":
      case "photo_with_caption": {
        const photos = attachments.filter(a => a.file_type === "photo");
        if (photos.length === 0) return null;

        return (
          <div className="flex flex-col h-full">
            <div className={`relative ${layout === "full_photo" ? "-mx-6 -mt-6 flex-1" : "mt-2"}`}>
              {layout === "full_photo" ? (
                <>
                  {getAttachmentUrl(photos[0]) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAttachmentUrl(photos[0]) as string}
                      alt={memory.title || "Memory photo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full animate-pulse bg-black/5" />
                  )}
                  {memory.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-5 pt-10 pb-4">
                      <h2 className="font-cormorant text-xl text-white/95 leading-snug">{memory.title}</h2>
                      {memory.content && <p className="mt-1 text-[13px] text-white/75 line-clamp-2 leading-relaxed">{memory.content}</p>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full overflow-hidden rounded border border-[rgba(160,130,90,0.22)] bg-[var(--surface-paper)] shadow-[var(--shadow-1)] relative p-2">
                    <PhotoGallery attachments={photos} />
                  </div>
                  {memory.content && (
                    <p className="mt-3 font-cormorant text-base italic leading-relaxed text-[var(--text-secondary)] px-1">
                      {memory.content}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }
        
      case "video": {
        const videos = attachments.filter(a => a.file_type === "video");
        if (videos.length === 0) return null;
        const videoUrl = getAttachmentUrl(videos[0]);
        return (
          <div className="flex flex-col h-full p-3 sm:p-5 justify-center">
            <div className="w-full overflow-hidden rounded border border-[rgba(160,130,90,0.18)] bg-[#1a1410] aspect-video shadow-[0_1px_8px_rgba(0,0,0,0.18)]">
              {videoUrl ? <VideoPlayer url={videoUrl} /> : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                  <span className="text-3xl opacity-30" aria-hidden="true">🎥</span>
                  <span className="sr-only">Video unavailable</span>
                </div>
              )}
            </div>
            {memory.content && (
              <p className="mt-4 font-cormorant text-base italic leading-relaxed text-stone-600 px-1">
                {memory.content}
              </p>
            )}
          </div>
        );
      }
        
      case "voice": {
        const voices = attachments.filter(a => a.file_type === "voice");
        if (voices.length === 0) return null;
        const voiceUrl = getAttachmentUrl(voices[0]);
        return (
          <div className="flex flex-col h-full justify-center p-4 sm:p-6">
            <div className="rounded-xl border border-[rgba(180,140,80,0.22)] bg-[#f3ead8]/70 p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)]">
              <h2 className="font-cormorant text-xl text-stone-800 mb-5 text-center leading-snug">
                {memory.title || "Voice note"}
              </h2>
              {voiceUrl ? <AudioPlayer url={voiceUrl} /> : (
                <div className="h-10 rounded animate-pulse bg-[rgba(180,140,80,0.15)]" aria-label="Loading audio" />
              )}
              {memory.content && (
                <p className="mt-5 font-cormorant text-base italic text-stone-600/85 text-center leading-relaxed">
                  &ldquo;{memory.content}&rdquo;
                </p>
              )}
            </div>
          </div>
        );
      }
        
      case "letter":
      case "text_only": {
        return (
          <div className="flex flex-col h-full p-3 sm:p-5">
            <div className="flex-1 rounded border border-[rgba(140,110,70,0.15)] bg-[#fdfaf6] p-5 sm:p-7 relative overflow-hidden flex flex-col shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              {/* Ruled-line background */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none opacity-[0.025]"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #6b5030 31px, #6b5030 32px)",
                  backgroundPosition: "0 40px"
                }}
              />

              <h2 className="font-cormorant text-[1.75rem] leading-snug text-stone-800 mb-5 relative z-10">
                {memory.title}
              </h2>

              <div className="flex-1 text-[15px] text-stone-700 leading-[1.9] relative z-10 whitespace-pre-wrap overflow-y-auto">
                {memory.content}
              </div>

              <div className="mt-6 text-right font-cormorant italic text-stone-400 text-sm relative z-10">
                — {memory.creator?.display_name || "Unknown"}
              </div>
            </div>
          </div>
        );
      }
        
      case "capsule": {
        return (
          <div className="flex flex-col h-full items-center justify-center p-6 sm:p-8">
            <div className="flex flex-col items-center text-center max-w-xs">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(180,140,80,0.35)] bg-[#f3ead8] mb-6 shadow-[0_1px_6px_rgba(0,0,0,0.07)]"
              >
                <span className="text-2xl">⏳</span>
              </div>
              <h2 className="font-cormorant text-2xl text-stone-800 mb-3 leading-snug">
                {memory.title || "Time Capsule"}
              </h2>
              <p className="text-[12px] text-stone-500 tracking-wide">
                Opened {new Date(memory.unlocked_at || memory.memory_date).toLocaleDateString()}
              </p>
              {memory.content && (
                <p className="mt-5 font-cormorant text-base leading-relaxed text-stone-700 italic">
                  {memory.content}
                </p>
              )}
            </div>
          </div>
        );
      }
        
      default:
        return null;
    }
  };

  return (
    <div
      className="absolute inset-0 w-full h-full bg-[#f5edd8] [backface-visibility:hidden] flex flex-col"
      style={{
        boxShadow: isLeftPage
          ? "inset -8px 0 16px -8px rgba(0,0,0,0.08)"
          : "inset 8px 0 16px -8px rgba(0,0,0,0.08)"
      }}
    >
      {/* Paper texture overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{
          opacity: 0.1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Date header */}
      <div className={`px-5 pt-4 pb-1 text-[10px] font-medium tracking-[0.2em] text-stone-400 uppercase ${isLeftPage ? "text-left" : "text-right"}`}>
        <time dateTime={memory.memory_date}>
          {new Date(memory.memory_date).toLocaleDateString(undefined, {
            month: 'long', day: 'numeric', year: 'numeric'
          })}
        </time>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 relative z-10 scrollbar-hide">
        {renderContent()}
      </div>

      {/* Page number */}
      <div className={`px-4 pb-3 text-[10px] text-stone-400 ${isLeftPage ? "text-left" : "text-right"}`}>
        {pageData.pageNumber}
      </div>
    </div>
  );
}
