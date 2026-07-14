import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BookPageData } from "@/types/storybook";
import { BookPage } from "./BookPage";
import { BookCover } from "./BookCover";
import { EntranceScene } from "./EntranceEffects";

interface BookLayoutProps {
  title: string;
  subtitle: string;
  dateStr?: string;
  pages: BookPageData[];
  hasMorePages?: boolean;
  isFetchingMore?: boolean;
  fetchMoreError?: boolean;
  onRetryFetchMore?: () => void;
  onPageChange?: (pageIndex: number, renderedPageCount: number) => void;
  onClose?: () => void;
}

export function BookLayout({
  title,
  subtitle,
  dateStr,
  pages,
  hasMorePages = false,
  isFetchingMore = false,
  fetchMoreError = false,
  onRetryFetchMore,
  onPageChange,
  onClose,
}: BookLayoutProps) {
  const [skipEntrance, setSkipEntrance] = useState(false);
  const [entranceSettled, setEntranceSettled] = useState(skipEntrance);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const markEntranceComplete = useCallback(() => {
    setSkipEntrance(true);
    setEntranceSettled(true);
  }, []);

  const totalPages = pages.length;

  useEffect(() => {
    const renderedPageCount = isMobile ? 1 : 2;
    onPageChange?.(currentIndex, renderedPageCount);
  }, [currentIndex, isMobile, onPageChange]);

  const handleNext = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      return;
    }
    if (isAnimating) return;

    const step = isMobile ? 1 : 2;
    if (currentIndex + step < totalPages) {
      setIsAnimating(true);
      setDirection(1);
      setCurrentIndex((prev) => prev + step);
    }
  }, [isOpen, currentIndex, totalPages, isMobile, isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating) return;

    const step = isMobile ? 1 : 2;
    if (currentIndex - step >= 0) {
      setIsAnimating(true);
      setDirection(-1);
      setCurrentIndex((prev) => prev - step);
    } else if (currentIndex === 0 && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, currentIndex, isMobile, isAnimating]);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape" && onClose) onClose();

      if (e.key === "Tab" && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) handleNext();
    if (diff < -50) handlePrev();
    setTouchStart(null);
  };

  const leftPage = pages[currentIndex];
  const rightPage = isMobile ? null : pages[currentIndex + 1];

  const springTransition = { type: "spring" as const, stiffness: 90, damping: 22, mass: 1, restDelta: 0.001 };

  const leftVariants = {
    desktopEnter: (dir: number) => ({
      rotateY: dir > 0 ? 90 : 0,
      opacity: dir > 0 ? 0 : 1,
      zIndex: dir > 0 ? 10 : 1,
      boxShadow: dir > 0 ? "-20px 0px 40px rgba(0,0,0,0.2)" : "none"
    }),
    desktopCenter: (dir: number) => ({
      rotateY: 0,
      opacity: 1,
      zIndex: dir > 0 ? 10 : 1,
      boxShadow: "0px 0px 0px rgba(0,0,0,0)",
      transition: springTransition
    }),
    desktopExit: (dir: number) => ({
      rotateY: dir > 0 ? 0 : 90,
      opacity: dir > 0 ? 1 : 0,
      zIndex: dir > 0 ? 1 : 10,
      boxShadow: dir > 0 ? "none" : "-20px 0px 40px rgba(0,0,0,0.2)",
      transition: springTransition
    }),
    mobileEnter: (dir: number) => ({ x: dir > 0 ? "20%" : "-20%", opacity: 0 }),
    mobileCenter: { x: 0, opacity: 1, transition: { duration: 0.4 } },
    mobileExit: (dir: number) => ({ x: dir > 0 ? "-20%" : "20%", opacity: 0, transition: { duration: 0.4 } }),
    reducedEnter: { opacity: 0 },
    reducedCenter: { opacity: 1, transition: { duration: 0.3 } },
    reducedExit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const rightVariants = {
    desktopEnter: (dir: number) => ({
      rotateY: dir > 0 ? 0 : -90,
      opacity: dir > 0 ? 1 : 0,
      zIndex: dir > 0 ? 1 : 10,
      boxShadow: dir > 0 ? "none" : "20px 0px 40px rgba(0,0,0,0.2)"
    }),
    desktopCenter: (dir: number) => ({
      rotateY: 0,
      opacity: 1,
      zIndex: dir > 0 ? 1 : 10,
      boxShadow: "0px 0px 0px rgba(0,0,0,0)",
      transition: springTransition
    }),
    desktopExit: (dir: number) => ({
      rotateY: dir > 0 ? -90 : 0,
      opacity: dir > 0 ? 0 : 1,
      zIndex: dir > 0 ? 10 : 1,
      boxShadow: dir > 0 ? "20px 0px 40px rgba(0,0,0,0.2)" : "none",
      transition: springTransition
    }),
    mobileEnter: (dir: number) => ({ x: dir > 0 ? "20%" : "-20%", opacity: 0 }),
    mobileCenter: { x: 0, opacity: 1, transition: { duration: 0.4 } },
    mobileExit: (dir: number) => ({ x: dir > 0 ? "-20%" : "20%", opacity: 0, transition: { duration: 0.4 } }),
    reducedEnter: { opacity: 0 },
    reducedCenter: { opacity: 1, transition: { duration: 0.3 } },
    reducedExit: { opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0f0c08]/92 p-4 md:p-12"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Memory Book"
    >
      <div className="sr-only" aria-live="polite">
        {isOpen && (
          `Chapter ${leftPage?.chapterTitle || "Unknown"}. Page ${currentIndex + 1}. ${leftPage?.memory.title || "Memory"}`
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 md:right-5 md:top-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/10 bg-amber-50/5 text-amber-100/45 transition-colors hover:bg-amber-50/12 hover:text-amber-100/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)]"
        aria-label="Close Book"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      {isOpen && (
        <div className="pointer-events-none absolute top-1/2 z-50 flex w-full -translate-y-1/2 justify-between px-2 md:px-8">
          <button
            type="button"
            onClick={handlePrev}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/12 bg-amber-50/8 text-amber-100/60 backdrop-blur-sm transition-colors hover:bg-amber-50/15 hover:text-amber-100/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
            aria-label="Previous Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex + (isMobile ? 1 : 2) >= totalPages}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/12 bg-amber-50/8 text-amber-100/60 backdrop-blur-sm transition-colors hover:bg-amber-50/15 hover:text-amber-100/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Next Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      )}

      {isOpen && hasMorePages && (isFetchingMore || fetchMoreError) && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-200/20 bg-black/45 px-4 py-2 text-sm text-amber-50/80 backdrop-blur-md">
            {isFetchingMore ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200/20 border-t-amber-200/80" />
                <span>Loading the next chapter...</span>
              </>
            ) : (
              <>
                <span>Couldn&apos;t load the next chapter.</span>
                {onRetryFetchMore && (
                  <button
                    type="button"
                    onClick={onRetryFetchMore}
                    className="rounded-full border border-amber-100/20 px-3 py-1 text-xs text-amber-50 transition-colors hover:bg-white/10"
                  >
                    Retry
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <EntranceScene
        reduceMotion={shouldReduceMotion || skipEntrance}
        isOpen={isOpen}
        onSettled={markEntranceComplete}
        onSkip={markEntranceComplete}
      >
        <div
          className="relative w-full max-w-5xl aspect-[3/4] md:aspect-[8/5]"
          style={{ perspective: "2000px" }}
        >
          <AnimatePresence initial={false} mode="wait">
            {!isOpen ? (
              <motion.div
                key="cover"
                className="absolute inset-0 md:inset-y-0 md:left-1/2 md:right-0 md:origin-left"
                exit={{ rotateY: -100, opacity: 0, transition: { duration: 0.8 } }}
              >
                <BookCover
                  title={title}
                  subtitle={subtitle}
                  dateStr={dateStr}
                  reduceMotion={shouldReduceMotion ?? false}
                  onClick={() => {
                    if (!entranceSettled) return;
                    setIsOpen(true);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="open-book"
                className="absolute inset-0 flex overflow-hidden rounded-xl bg-amber-950 shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {!isMobile && (
                  <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-20 -ml-3 w-6 bg-gradient-to-r from-black/0 via-black/28 to-black/0 shadow-inner" />
                )}

                <div className="relative h-full w-full flex-1 overflow-visible">
                  <AnimatePresence mode="popLayout" custom={direction}>
                    <motion.div
                      key={`page-${currentIndex}`}
                      custom={direction}
                      initial={shouldReduceMotion ? "reducedEnter" : isMobile ? "mobileEnter" : "desktopEnter"}
                      animate={shouldReduceMotion ? "reducedCenter" : isMobile ? "mobileCenter" : "desktopCenter"}
                      exit={shouldReduceMotion ? "reducedExit" : isMobile ? "mobileExit" : "desktopExit"}
                      variants={leftVariants}
                      className="absolute inset-0 origin-right"
                      style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                      onAnimationComplete={handleAnimationComplete}
                    >
                      {leftPage ? (
                        <BookPage pageData={leftPage} isLeftPage={!isMobile} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#f4ebd8] font-serif text-zinc-400">
                          Blank Page
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {!isMobile && (
                  <div className="relative h-full w-full flex-1 overflow-visible">
                    <AnimatePresence mode="popLayout" custom={direction}>
                      <motion.div
                        key={`page-${currentIndex + 1}`}
                        custom={direction}
                        initial={shouldReduceMotion ? "reducedEnter" : "desktopEnter"}
                        animate={shouldReduceMotion ? "reducedCenter" : "desktopCenter"}
                        exit={shouldReduceMotion ? "reducedExit" : "desktopExit"}
                        variants={rightVariants}
                        className="absolute inset-0 origin-left"
                        style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                        onAnimationComplete={handleAnimationComplete}
                      >
                        {rightPage ? (
                          <BookPage pageData={rightPage} isLeftPage={false} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#f4ebd8] font-serif text-zinc-400">
                            Blank Page
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </EntranceScene>
    </div>
  );
}

