/* Lucian UX/UI Prompt #460 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#460 */
"use client";

import React, { useState, useEffect, useRef, useId, useCallback } from "react";
import { Camera, Image as ImageIcon, Mic, Mail } from "lucide-react";
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./gooey-mobile-fab-460.css";

interface GooeyMobileFab460Props {
  memoryShelfOpen?: boolean;
  className?: string;
}

export function GooeyMobileFab460({
  memoryShelfOpen = false,
  className,
}: GooeyMobileFab460Props) {
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

  // Radial geometry
  const radius = 88;
  const angles = memoryShelfOpen
    ? [-180, -150, -120, -90]
    : [-157.5, -112.5, -67.5, -22.5];

  const actions = [
    {
      id: "photo",
      label: "Thêm ảnh",
      icon: ImageIcon,
      angle: angles[0],
    },
    {
      id: "camera",
      label: "Chụp ảnh / Video",
      icon: Camera,
      angle: angles[1],
    },
    {
      id: "voice",
      label: "Ghi âm giọng nói",
      icon: Mic,
      angle: angles[2],
    },
    {
      id: "letter",
      label: "Viết thư lưu niệm",
      icon: Mail,
      angle: angles[3],
    },
  ];

  // Dynamic SVG Gooey filter toggle directly on DOM for 60fps GPU performance
  useEffect(() => {
    if (gooTimeoutRef.current) clearTimeout(gooTimeoutRef.current);
    const goo = gooRef.current;
    if (!goo) return;

    if (isOpen) {
      goo.style.filter = `url(#${filterId})`;
    } else {
      gooTimeoutRef.current = setTimeout(
        () => {
          if (goo) goo.style.filter = "";
        },
        shouldReduceMotion ? 0 : 850
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
        { duration: 560, easing: "ease-out" }
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

  const handleActionClick = (index: number) => {
    trigger("medium");
    const blobEl = actionBlobRefs.current[index];
    const act = actions[index];

    if (!shouldReduceMotion && blobEl?.animate) {
      const rad = (act.angle * Math.PI) / 180;
      const tx = (Math.cos(rad) * radius).toFixed(1) + "px";
      const ty = (Math.sin(rad) * radius).toFixed(1) + "px";
      blobEl.animate(
        [
          { transform: `translate(${tx}, ${ty}) scale(1.1)` },
          { transform: `translate(${tx}, ${ty}) scale(1.28)` },
          { transform: `translate(${tx}, ${ty}) scale(1)` },
        ],
        { duration: 260, easing: "ease-out" }
      );
    }

    setTimeout(
      () => {
        setIsOpen(false);
        openModal();
      },
      shouldReduceMotion ? 0 : 180
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

  return (
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
        {/* Gooey blobs stage */}
        <div className="u460-sh" aria-hidden="true">
          <div ref={gooRef} className="u460-goo">
            {actions.map((act, index) => {
              const rad = (act.angle * Math.PI) / 180;
              const tx = (Math.cos(rad) * radius).toFixed(1) + "px";
              const ty = (Math.sin(rad) * radius).toFixed(1) + "px";

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
            const tx = (Math.cos(rad) * radius).toFixed(1) + "px";
            const ty = (Math.sin(rad) * radius).toFixed(1) + "px";

            return (
              <button
                key={act.id}
                ref={(el) => {
                  actionButtonRefs.current[index] = el;
                }}
                type="button"
                className="u460-a"
                aria-label={act.label}
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
                onClick={() => handleActionClick(index)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
