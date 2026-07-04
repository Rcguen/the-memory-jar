"use client";

import { motion, useMotionValue, type MotionStyle } from "framer-motion";
import { useRef, useState } from "react";
import { NormalizedVisualState } from "@/lib/physics/EngineCore";
import { useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { usePhysics } from "@/providers/physics-provider";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { Lock } from "lucide-react";
import { MEMORY_SIZES } from "@/lib/physics/EngineCore";
import { useQueryClient } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";

// The heavy SVG components have been removed to improve physics rendering performance.
// We now use lightweight emoji badges.

interface MemoryObjectFactoryProps {
  state: NormalizedVisualState;
  onClick: (id: string) => void;
}

export function MemoryObjectFactory({ state, onClick }: MemoryObjectFactoryProps) {
  const { registerMotionValues, unregisterMotionValues } = usePhysics();
  const { viewingMemoryId } = useMemoryViewer();
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  const prefetchTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number; pointerType: string } | null>(null);

  const x = useMotionValue<string | number>(`${state.x * 100}%`);
  const y = useMotionValue<string | number>(`${state.y * 100}%`);
  const rotate = useMotionValue<string | number>(`${state.rotation}rad`);

  useEffect(() => {
    registerMotionValues(state.id, x, y, rotate);
    return () => {
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }
      unregisterMotionValues(state.id);
    };
  }, [state.id, x, y, rotate, registerMotionValues, unregisterMotionValues]);

  const unlockAtMs = state.unlockAt ? new Date(state.unlockAt).getTime() : 0;
  const isLocked = !!state.unlockAt && Number.isFinite(unlockAtMs) && Date.now() < unlockAtMs;

  const handleHoverStart = () => {
    setIsHovered(true);

    if (prefetchTimerRef.current !== null) window.clearTimeout(prefetchTimerRef.current);

    prefetchTimerRef.current = window.setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['memory', state.id],
        queryFn: async () => {
          const memory = await memoryService.getMemoryById(state.id);
          if (memory && memory.attachments) {
            memory.attachments.forEach(async (att) => {
              try {
                const url = await queryClient.fetchQuery({
                  queryKey: ['attachmentUrl', att.id, att.url],
                  queryFn: () => memoryService.getAttachmentUrlAsync(att.file_type, att.url),
                  staleTime: 1000 * 60 * 30
                });
                
                if (att.file_type === 'photo') {
                  const img = new window.Image();
                  img.src = url;
                } else if (att.file_type === 'voice' || att.file_type === 'video') {
                  const media = new window.Audio();
                  media.preload = 'metadata';
                  media.src = url;
                }
              } catch (e) {
                console.warn("Failed to prefetch media", e);
              }
            });
          }
          return memory;
        }
      });
    }, 240);
  };

  const handleHoverEnd = () => {
    if (prefetchTimerRef.current !== null) {
      window.clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    setIsHovered(false);
  };

  const openMemory = () => {
    if (viewingMemoryId !== state.id) {
      onClick(state.id);
    }
  };

  const releasePointer = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);
    event.stopPropagation();

    const pointerType = event.pointerType || start?.pointerType || "mouse";
    const movement = start ? Math.hypot(event.clientX - start.x, event.clientY - start.y) : 0;
    const movementLimit = pointerType === "touch" ? 34 : 12;
    if (movement <= movementLimit) {
      openMemory();
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);
    event.stopPropagation();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMemory();
    }
  };

  // We apply x, y as percentages (top/left) and then translate -50% -50% so the center matches.
  const sizeConfig = MEMORY_SIZES[state.type] || MEMORY_SIZES.random_thought;
  const hitTargetPx = 76;
  
  const style: MotionStyle = {
    position: "absolute",
    left: x,
    top: y,
    width: `${sizeConfig.width * 100}%`,
    minWidth: hitTargetPx,
    minHeight: hitTargetPx,
    aspectRatio: `${sizeConfig.width} / ${sizeConfig.height}`,
    x: "-50%",
    y: "-50%",
    rotate,
    scale: state.scale,
    filter: Math.abs(state.vy) > 12 ? "blur(0.6px)" : "none",
    transition: "filter 0.1s ease-out",
    zIndex: Math.max(1, Math.round(state.y * 100)),
    willChange: "transform",
    cursor: "pointer",
    touchAction: "manipulation",
    opacity: viewingMemoryId === state.id ? 0 : 1,
  };

  const getEmoji = () => {
    if (isLocked) {
      switch (state.capsuleStyle) {
        case "vintage_parcel": return "📦";
        case "ribbon_box": return "🎁";
        case "wax_capsule": return "📜";
        case "glass_capsule": return "🔮";
        case "wooden_box": return "🧰";
        case "silk_envelope": return "✉️";
        default: return "🔒";
      }
    }
    switch (state.type) {
      case "photo": return "📷";
      case "voice": return "🎤";
      case "video": return "🎬";
      case "letter": return "💌";
      case "wish": return "⭐";
      case "travel": return "✈️";
      case "gratitude": return "🌸";
      case "promise": return "💍";
      case "random_thought": return "💭";
      default: return "📝";
    }
  };

  const renderObject = () => {
    return (
      <div className="w-full h-full flex items-center justify-center group pointer-events-auto">
        <span className="text-2xl sm:text-3xl drop-shadow-md filter group-hover:scale-110 transition-transform duration-300">
          {getEmoji()}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      layoutId={state.isSleeping ? `memory-${state.id}` : undefined}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
      role="button"
      tabIndex={viewingMemoryId === state.id ? -1 : 0}
      aria-label="Open memory"
    >
      {renderObject()}
      
      {/* Tooltip for locked memories */}
      {isLocked && isHovered && viewingMemoryId !== state.id && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xl pointer-events-none"
          style={{ transform: `translate(-50%, 0) rotate(${-state.rotation}rad)` }} // Counter-rotate so text is always straight
        >
          <Lock className="w-3 h-3 text-amber-400" />
          <div className="flex flex-col items-center leading-tight">
            <span>Opens {format(new Date(state.unlockAt!), "d MMM yyyy")}</span>
            <span className="text-[10px] text-zinc-400 font-normal">
              {formatDistanceToNow(new Date(state.unlockAt!), { addSuffix: true })}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
