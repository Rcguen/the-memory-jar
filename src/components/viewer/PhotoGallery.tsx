/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { memoryService } from "@/services/memory";
import { MemoryAttachment } from "@/types/memory";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  attachments: MemoryAttachment[];
  onFullscreenChange?: (isOpen: boolean) => void;
}

export function PhotoGallery({ attachments, onFullscreenChange }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const urls = useQueries({
    queries: attachments.map((attachment) => ({
      queryKey: ["signedAttachmentUrl", attachment.id, attachment.url],
      queryFn: () => memoryService.getAttachmentUrlAsync(attachment.file_type, attachment.url),
      staleTime: 1000 * 60 * 30,
    })),
  });

  const loadedUrls = urls.map((query) => query.data).filter((url): url is string => Boolean(url));
  const currentUrl = activeIndex !== null ? loadedUrls[activeIndex] : null;

  const goNext = useCallback(() => {
    setActiveIndex((index) => index === null ? 0 : Math.min(index + 1, loadedUrls.length - 1));
  }, [loadedUrls.length]);
  const goPrev = useCallback(() => {
    setActiveIndex((index) => index === null ? 0 : Math.max(index - 1, 0));
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

  useEffect(() => {
    onFullscreenChange?.(activeIndex !== null);
  }, [activeIndex, onFullscreenChange]);

  useEffect(() => {
    return () => onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className={cn("w-full", attachments.length === 1 ? "flex min-h-[18rem] items-center justify-center rounded-[var(--radius-medium)] bg-stone-900/5 p-3" : "grid grid-cols-2 gap-3 lg:grid-cols-2")}>
        {attachments.map((attachment, index) => {
          const url = urls[index]?.data;
          const isSingle = attachments.length === 1;
          return (
            <motion.button
              key={attachment.id}
              type="button"
              initial={{ opacity: 0, y: 14, scale: 0.98, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.018, filter: "brightness(1.04)" }}
              onClick={() => url && setActiveIndex(index)}
              className={cn(
                "relative overflow-hidden rounded-xl text-left",
                isSingle 
                  ? "w-full border border-black/5 shadow-sm" 
                  : "w-full border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              )}
            >
              {url ? (
                <motion.img layoutId={`photo-${attachment.id}`} src={url} alt="Memory attachment" loading="lazy" className={cn("w-full rounded-xl bg-black/5 dark:bg-white/5", isSingle ? "h-full max-h-[calc(100dvh-16rem)] w-full object-contain" : "h-48 w-full object-cover lg:h-56")} />
              ) : (
                <div className={cn("w-full animate-pulse bg-black/5 dark:bg-white/5 rounded-xl", isSingle ? "h-[min(60dvh,42rem)]" : "h-48 lg:h-56")} />
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

      {mounted && createPortal(
      <AnimatePresence>
        {currentUrl && activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 md:p-12"
            onClick={() => setActiveIndex(null)}
          >
            <button
              type="button"
              className="absolute right-6 top-6 z-[99999] rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/20"
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
                  disabled={activeIndex === 0} className="absolute left-4 top-1/2 z-[99999] inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-35"
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
                  disabled={activeIndex === loadedUrls.length - 1} className="absolute right-4 top-1/2 z-[99999] inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-35"
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

            <motion.img key={activeIndex} layoutId={`photo-${attachments[activeIndex].id}`} src={currentUrl} alt="Memory attachment" className="h-full max-h-[90dvh] w-full max-w-5xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}

