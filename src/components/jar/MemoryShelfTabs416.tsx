/* Lucian UX/UI Prompt #416 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#416 */
"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { BookOpen, Flame } from "lucide-react";
import "./memory-shelf-tabs-416.css";

export type ShelfView = "memories" | "activity";

interface MemoryShelfTabs416Props {
  activeView: ShelfView;
  onViewChange: (view: ShelfView) => void;
  memoriesCount?: number;
}

const TABS: { id: ShelfView; label: string; icon: typeof BookOpen }[] = [
  { id: "memories", label: "Memories", icon: BookOpen },
  { id: "activity", label: "Activity", icon: Flame },
];

export function MemoryShelfTabs416({
  activeView,
  onViewChange,
  memoriesCount,
}: MemoryShelfTabs416Props) {
  const uid = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentIndex = activeView === "memories" ? 0 : 1;

  const updateThumb = useCallback((index: number, direction: number) => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    const targetTab = tabRefs.current[index];
    if (!track || !thumb || !targetTab) return;

    const trackWidth = track.clientWidth;
    const tabLeft = targetTab.offsetLeft;
    const tabWidth = targetTab.offsetWidth;
    const tabRight = trackWidth - tabLeft - tabWidth;

    thumb.style.setProperty("--tl", direction > 0 ? "0.62s" : "0.38s");
    thumb.style.setProperty("--tr", direction > 0 ? "0.38s" : "0.62s");
    thumb.style.setProperty("--l", `${tabLeft}px`);
    thumb.style.setProperty("--r", `${tabRight}px`);
  }, []);

  // Sync thumb position on view change and element resize
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateThumb(currentIndex, 0);

    const observer = new ResizeObserver(() => {
      const target = tabRefs.current[currentIndex];
      const thumb = thumbRef.current;
      if (!target || !thumb) return;
      thumb.style.setProperty("--l", `${target.offsetLeft}px`);
      thumb.style.setProperty("--r", `${track.clientWidth - target.offsetLeft - target.offsetWidth}px`);
    });

    observer.observe(track);
    return () => observer.disconnect();
  }, [currentIndex, updateThumb]);

  const selectTab = (index: number, focus = false) => {
    const target = TABS[index];
    if (!target) return;
    if (index !== currentIndex) {
      const direction = index > currentIndex ? 1 : -1;
      updateThumb(index, direction);
      onViewChange(target.id);
    }
    if (focus) {
      tabRefs.current[index]?.focus({ preventScroll: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const count = TABS.length;
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % count;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + count) % count;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = count - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      selectTab(nextIndex, true);
    }
  };

  return (
    <div className="u416">
      <div
        ref={trackRef}
        className="u416-tl"
        role="tablist"
        aria-label="Memory Shelf View"
        onKeyDown={handleKeyDown}
      >
        <span ref={thumbRef} className="u416-th" aria-hidden="true" />
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const isSelected = activeView === tab.id;
          const tabId = `${uid}-tab-${tab.id}`;
          const panelId = `memory-shelf-${tab.id}`;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={tabId}
              type="button"
              className="u416-tab"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectTab(i)}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.id === "memories" && typeof memoriesCount === "number" && (
                <span className="u416-badge" aria-label={`${memoriesCount} keepsakes`}>
                  {memoriesCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
