"use client";

import { motion, useMotionValue } from "framer-motion";
import { MemoryType } from "@/types/memory";
import { useState } from "react";
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
  const { pokeMemory, registerMotionValues, unregisterMotionValues } = usePhysics();
  const { viewingMemoryId, openViewer } = useMemoryViewer();
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();

  const x = useMotionValue<string | number>(`${state.x * 100}%`);
  const y = useMotionValue<string | number>(`${state.y * 100}%`);
  const rotate = useMotionValue<string | number>(`${state.rotation}rad`);

  useEffect(() => {
    registerMotionValues(state.id, x, y, rotate);
    return () => unregisterMotionValues(state.id);
  }, [state.id, x, y, rotate, registerMotionValues, unregisterMotionValues]);

  const isLocked = state.status === "sealed" && state.unlockAt !== null;

  const handleHoverStart = () => {
    setIsHovered(true);
    // Poke the memory slightly on hover to give it life
    if (state.isSleeping && viewingMemoryId !== state.id) {
      pokeMemory(state.id);
    }

    // Prefetch memory data and media metadata
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
                const media = new window.Audio(); // Works for preloading video metadata too
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
  };

  const handleHoverEnd = () => {
    setIsHovered(false);
  };

  const handleClick = () => {
    if (viewingMemoryId !== state.id) {
      openViewer(state.id);
      onClick(state.id);
    }
  };

  // We apply x, y as percentages (top/left) and then translate -50% -50% so the center matches.
  const sizeConfig = MEMORY_SIZES[state.type] || MEMORY_SIZES.random_thought;
  
  const style: React.CSSProperties | any = {
    position: "absolute",
    left: x,
    top: y,
    width: `${sizeConfig.width * 100}%`,
    aspectRatio: `${sizeConfig.width} / ${sizeConfig.height}`,
    x: "-50%",
    y: "-50%",
    rotate: rotate,
    scale: state.scale,
    // Use velocity to add subtle micro-animations
    filter: Math.abs(state.vy) > 10 ? "blur(1px)" : "none",
    transition: "filter 0.1s ease-out",
    zIndex: state.z_index || 1,
    willChange: "transform",
    cursor: "pointer",
    // Hide the physical copy if it's currently being viewed in the portal
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
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onClick={handleClick}
      whileHover={viewingMemoryId !== state.id ? { scale: state.scale * 1.05, filter: "brightness(1.1) drop-shadow(0px 10px 15px rgba(0,0,0,0.3))" } : {}}
      whileTap={viewingMemoryId !== state.id ? { scale: state.scale * 0.95 } : {}}
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
