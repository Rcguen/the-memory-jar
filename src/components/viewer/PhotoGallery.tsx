/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { memoryService } from "@/services/memory";
import { MemoryAttachment } from "@/types/memory";

interface PhotoGalleryProps {
  attachments: MemoryAttachment[];
}

export function PhotoGallery({ attachments }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const urls = useQueries({
    queries: attachments.map((attachment) => ({
      queryKey: ["attachmentUrl", attachment.id, attachment.url],
      queryFn: () => memoryService.getAttachmentUrlAsync(attachment.file_type, attachment.url),
      staleTime: 1000 * 60 * 30,
    })),
  });

  const loadedUrls = urls.map((query) => query.data).filter((url): url is string => Boolean(url));
  const currentUrl = activeIndex !== null ? loadedUrls[activeIndex] : null;

  const goNext = useCallback(() => {
    setActiveIndex((index) => index === null ? 0 : (index + 1) % loadedUrls.length);
  }, [loadedUrls.length]);
  const goPrev = useCallback(() => {
    setActiveIndex((index) => index === null ? 0 : (index - 1 + loadedUrls.length) % loadedUrls.length);
  }, [loadedUrls.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, loadedUrls.length]);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attachments.map((attachment, index) => {
          const url = urls[index]?.data;
          return (
            <motion.button
              key={attachment.id}
              type="button"
              initial={{ opacity: 0, y: 14, scale: 0.98, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.018, filter: "brightness(1.04)" }}
              onClick={() => url && setActiveIndex(index)}
              className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5 text-left dark:border-white/10 dark:bg-white/5"
            >
              {url ? (
                <img src={url} alt="Memory attachment" loading="lazy" className="h-64 w-full object-cover" />
              ) : (
                <div className="h-64 w-full animate-pulse bg-black/5 dark:bg-white/5" />
              )}
              {attachments.length > 1 && (
                <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-md">
                  {index + 1} / {attachments.length}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {currentUrl && activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-4 md:p-12"
            onClick={() => setActiveIndex(null)}
          >
            <button
              type="button"
              className="absolute right-6 top-6 z-[230] rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(null);
              }}
              aria-label="Close gallery"
            >
              <X className="h-5 w-5" />
            </button>

            {loadedUrls.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 z-[230] -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 z-[230] -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.img
              key={currentUrl}
              src={currentUrl}
              alt="Memory attachment fullscreen"
              className="max-h-full max-w-full cursor-grab object-contain active:cursor-grabbing"
              initial={{ opacity: 0, scale: 0.88, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.82, y: 34, filter: "blur(10px)" }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.22}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) goNext();
                if (info.offset.x > 80) goPrev();
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md">
              {activeIndex + 1} / {loadedUrls.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
