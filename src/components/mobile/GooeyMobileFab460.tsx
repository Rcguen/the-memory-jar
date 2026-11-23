/* Lucian UX/UI Prompt #460 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#460 */
"use client";

import React, { useState, useEffect, useRef, useId, useCallback } from "react";
import {
  HeartHandshake,
  Mail,
  Image as ImageIcon,
  Mic,
  Video,
  Plane,
  Star,
  Heart,
  MessageCircleQuestion,
} from "lucide-react";
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "framer-motion";
import { MemoryType } from "@/types/memory";
import { cn } from "@/lib/utils";
import "./gooey-mobile-fab-460.css";

interface GooeyMobileFab460Props {
  className?: string;
}

interface ActionItem {
  id: MemoryType;
  label: string;
  sublabel: string;
  description: string;
  icon: React.ElementType;
  angle: number;
  radius: number;
}

export function GooeyMobileFab460({ className }: GooeyMobileFab460Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { openModal } = useMemoryModal();
  const { trigger } = useHaptics();
  const shouldReduceMotion = useReducedMotion();

  const rawId = useId();
  const uid = "u460_" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `${uid}_filter`;
  const menuId = `${uid}_menu`;

  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const fabBlobRef = useRef<HTMLElement>(null);
  const gooRef = useRef<HTMLDivElement>(null);
  const actionBlobRefs = useRef<(HTMLElement | null)[]>([]);
  const actionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gooTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 9 memory types perfectly spaced in a balanced dual-tier crown arc
  // Outer tier (R=122px, 5 items), Inner tier (R=84px, 4 items)
  const actions: ActionItem[] = [
    {
      id: "promise",
      label: "Promise",
      sublabel: "Lời thề ước",
      description: "A vow to keep forever.",
      icon: HeartHandshake,
      angle: -162,
      radius: 122,
    },
    {
      id: "letter",
      label: "Letter",
      sublabel: "Bức thư",
      description: "Words meant for the soul.",
      icon: Mail,
      angle: -144,
      radius: 84,
    },
    {
      id: "photo",
      label: "Photo",
      sublabel: "Hình ảnh",
      description: "A captured moment in time.",
      icon: ImageIcon,
      angle: -126,
      radius: 122,
    },
    {
      id: "voice",
      label: "Voice",
      sublabel: "Giọng nói",
      description: "The warmth of spoken words.",
      icon: Mic,
      angle: -108,
      radius: 84,
    },
    {
      id: "video",
      label: "Video",
      sublabel: "Thước phim",
      description: "Living, breathing memories.",
      icon: Video,
      angle: -90,
      radius: 122,
    },
    {
      id: "travel",
      label: "Travel",
      sublabel: "Chuyến đi",
      description: "Adventures shared together.",
      icon: Plane,
      angle: -72,
      radius: 84,
    },
    {
      id: "wish",
      label: "Wish",
      sublabel: "Điều ước",
      description: "Hopes for the future.",
      icon: Star,
      angle: -54,
      radius: 122,
    },
    {
      id: "gratitude",
      label: "Gratitude",
      sublabel: "Lòng biết ơn",
      description: "Thankful for the little things.",
      icon: Heart,
      angle: -36,
      radius: 84,
    },
    {
      id: "random_thought",
      label: "Thought",
      sublabel: "Suy nghĩ",
      description: "Just something on my mind.",
      icon: MessageCircleQuestion,
      angle: -18,
      radius: 122,
    },
  ];

  // Smart Gooey cutoff:
  // Gooey filter is active strictly during shoot-out and collapse transitions.
  // When at rest, filter is turned OFF so bubbles remain 100% crisp, separated spheres!
  useEffect(() => {
    if (gooTimeoutRef.current) clearTimeout(gooTimeoutRef.current);
    const goo = gooRef.current;
    if (!goo) return;

    if (isOpen) {
      // Turn ON filter for the fluid stretch emergence
      goo.style.filter = `url(#${filterId})`;
      // Turn OFF after stretch completes to eliminate caterpillar fusion
      gooTimeoutRef.current = setTimeout(
        () => {
          if (goo) goo.style.filter = "";
        },
        shouldReduceMotion ? 0 : 380
      );
    } else {
      // Turn ON filter immediately so collapsing bubbles melt together
      goo.style.filter = `url(#${filterId})`;
      // Turn OFF after collapse completes
      gooTimeoutRef.current = setTimeout(
        () => {
          if (goo) goo.style.filter = "";
        },
        shouldReduceMotion ? 0 : 480
      );
    }

    return () => {
      if (gooTimeoutRef.current) clearTimeout(gooTimeoutRef.current);
    };
  }, [isOpen, filterId, shouldReduceMotion]);

  // Squish animation on center FAB blob
  const squish = useCallback(
    (k: number) => {
      if (shouldReduceMotion || !fabBlobRef.current?.animate) return;
      fabBlobRef.current.animate(
        [
          { transform: "scale(1)" },
          { transform: `scale(${k})`, offset: 0.3 },
          { transform: "scale(1.06)", offset: 0.65 },
          { transform: "scale(1)" },
        ],
        { duration: 520, easing: "ease-out" }
      );
    },
    [shouldReduceMotion]
  );

  const toggleOpen = useCallback(() => {
    const next = !isOpen;
    trigger("light");
    setIsOpen(next);
    squish(next ? 0.86 : 0.9);
  }, [isOpen, trigger, squish]);

  const handleActionClick = (index: number, memoryType: MemoryType) => {
    trigger("medium");
    const blobEl = actionBlobRefs.current[index];
    const act = actions[index];

    if (!shouldReduceMotion && blobEl?.animate) {
      const rad = (act.angle * Math.PI) / 180;
      const tx = (Math.cos(rad) * act.radius).toFixed(1) + "px";
      const ty = (Math.sin(rad) * act.radius).toFixed(1) + "px";
      blobEl.animate(
        [
          { transform: `translate(${tx}, ${ty}) scale(1.1)` },
          { transform: `translate(${tx}, ${ty}) scale(1.28)` },
          { transform: `translate(${tx}, ${ty}) scale(1)` },
        ],
        { duration: 240, easing: "ease-out" }
      );
    }

    setTimeout(
      () => {
        setIsOpen(false);
        openModal(memoryType);
      },
      shouldReduceMotion ? 0 : 160
    );
  };

  // Outside click handling
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        squish(0.9);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, squish]);

  // Keyboard navigation (Escape + Arrows)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      squish(0.9);
      fabRef.current?.focus({ preventScroll: true });
      return;
    }

    if (/^Arrow(Left|Up|Right|Down)$/.test(e.key)) {
      e.preventDefault();
      const isForward = e.key === "ArrowRight" || e.key === "ArrowDown";
      const currentIndex = actionButtonRefs.current.findIndex(
        (btn) => btn === document.activeElement
      );

      let nextIndex = 0;
      if (currentIndex < 0) {
        nextIndex = isForward ? 0 : actions.length - 1;
      } else {
        nextIndex =
          (currentIndex + (isForward ? 1 : -1) + actions.length) % actions.length;
      }

      actionButtonRefs.current[nextIndex]?.focus({ preventScroll: true });
    }
  };

  const hoveredAction = hoveredIndex !== null ? actions[hoveredIndex] : null;

  return (
    <>
      {/* Soft dimming backdrop */}
      <div
        className={cn("u460-backdrop", isOpen && "is-open")}
        onClick={() => {
          setIsOpen(false);
          squish(0.9);
        }}
        aria-hidden="true"
      />

      <div
        ref={rootRef}
        className={cn("ux u460", isOpen && "is-open", className)}
        onKeyDown={handleKeyDown}
      >
        {/* SVG gooey filter definition */}
        <svg className="u460-defs" aria-hidden="true" focusable="false">
          <filter
            id={filterId}
            className="u460-f"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
            <feColorMatrix
              in="b"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
              result="g"
            />
            <feComposite in="SourceGraphic" in2="g" operator="atop" />
          </filter>
        </svg>

        <div className="u460-st">
          {/* Refined Tooltip Pill Badge */}
          <div
            className={cn("u460-pill", hoveredAction && "is-visible")}
            aria-live="polite"
          >
            <span className="u460-pill-dot" />
            <span>{hoveredAction?.label}</span>
            {hoveredAction?.sublabel && (
              <span className="u460-pill-desc">{hoveredAction.sublabel}</span>
            )}
          </div>

          {/* Gooey fluid blobs stage */}
          <div className="u460-sh" aria-hidden="true">
            <div ref={gooRef} className="u460-goo">
              {actions.map((act, index) => {
                const rad = (act.angle * Math.PI) / 180;
                const tx = (Math.cos(rad) * act.radius).toFixed(1) + "px";
                const ty = (Math.sin(rad) * act.radius).toFixed(1) + "px";

                return (
                  <i
                    key={act.id}
                    ref={(el) => {
                      actionBlobRefs.current[index] = el;
                    }}
                    className={cn("u460-bb", hoveredIndex === index && "is-hov")}
                    style={
                      {
                        "--u460-i": index,
                        "--u460-tx": isOpen ? tx : "0px",
                        "--u460-ty": isOpen ? ty : "0px",
                      } as React.CSSProperties
                    }
                  />
                );
              })}
              <i
                ref={fabBlobRef}
                className="u460-bb is-fab"
              />
            </div>
          </div>

          {/* Center Trigger FAB */}
          <button
            ref={fabRef}
            type="button"
            className="u460-fab"
            aria-label={isOpen ? "Đóng menu lưu niệm" : "Lưu kỷ niệm mới"}
            aria-haspopup="true"
            aria-expanded={isOpen}
            aria-controls={menuId}
            onClick={toggleOpen}
          >
            <span className="u460-fab-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-6 w-6 fill-none stroke-current stroke-[2.4] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>

          {/* Radial Action Buttons */}
          <div
            id={menuId}
            className="u460-ic"
            role="group"
            aria-label="Tùy chọn tạo kỷ niệm"
          >
            {actions.map((act, index) => {
              const Icon = act.icon;
              const rad = (act.angle * Math.PI) / 180;
              const tx = (Math.cos(rad) * act.radius).toFixed(1) + "px";
              const ty = (Math.sin(rad) * act.radius).toFixed(1) + "px";

              return (
                <button
                  key={act.id}
                  ref={(el) => {
                    actionButtonRefs.current[index] = el;
                  }}
                  type="button"
                  className={cn("u460-a", hoveredIndex === index && "is-active")}
                  aria-label={`${act.label}: ${act.description}`}
                  tabIndex={isOpen ? 0 : -1}
                  aria-hidden={!isOpen}
                  style={
                    {
                      "--u460-i": index,
                      "--u460-tx": isOpen ? tx : "0px",
                      "--u460-ty": isOpen ? ty : "0px",
                    } as React.CSSProperties
                  }
                  onPointerEnter={() => setHoveredIndex(index)}
                  onPointerLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  onClick={() => handleActionClick(index, act.id)}
                >
                  <Icon aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
