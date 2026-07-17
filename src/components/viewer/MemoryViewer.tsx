"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { usePhysics } from "@/providers/physics-provider";
import { MemoryType } from "@/types/memory";
import { ViewerAnimation } from "./ViewerAnimation";
import { TimeCapsuleViewer } from "./TimeCapsuleViewer";
import { EditMemoryModal } from "../jar/EditMemoryModal";
import { useMemory } from "@/hooks/useMemoryData";
import { useAuth } from "@/providers/auth-provider";
import { memoryService } from "@/services/memory";
import { useIsPhone } from "@/hooks/useIsPhone";
import { notifyPushEvent } from "@/lib/push/client-events";

type ViewerState = "LOADING" | "LOCKED" | "WAITING_PARTNER" | "OPENING" | "VIEWING" | "ERROR";

function getCloseMotion(type: MemoryType) {
  switch (type) {
    case "letter":
    case "promise":
      return {
        opacity: 0,
        y: 44,
        scale: 0.78,
        rotateX: 72,
        rotateZ: -4,
        filter: "blur(10px)",
      };
    case "photo":
      return {
        opacity: 0,
        y: 30,
        scale: 0.72,
        rotateZ: 7,
        filter: "blur(8px) saturate(0.65)",
      };
    case "random_thought":
    case "wish":
    case "gratitude":
      return {
        opacity: 0,
        y: -26,
        scale: 0.65,
        rotateZ: 12,
        filter: "blur(16px) brightness(1.25)",
      };
    case "voice":
    case "video":
      return {
        opacity: 0,
        y: 36,
        scale: 0.76,
        rotateX: -24,
        filter: "blur(9px)",
      };
    case "travel":
      return {
        opacity: 0,
        x: -56,
        y: 24,
        scale: 0.74,
        rotateZ: -8,
        filter: "blur(8px)",
      };
    default:
      return {
        opacity: 0,
        y: 34,
        scale: 0.78,
        filter: "blur(10px)",
      };
  }
}

export function MemoryViewer() {
  const { viewingMemoryId, navigateDirection, closeViewer } = useMemoryViewer();
  const { states, removeMemory, pausePhysics, resumePhysics } = usePhysics();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingCapsule, setIsEditingCapsule] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const capsuleDeleteTimerRef = useRef<number | null>(null);
  const unlockedPushNotifiedRef = useRef<Set<string>>(new Set());
  const { data: fullMemory, isLoading, isError } = useMemory(viewingMemoryId);
  const isPhone = useIsPhone();
  const isViewerOpen = Boolean(viewingMemoryId);

  const activeMemoryState = useMemo(() => {
    if (!viewingMemoryId) return null;

    const state = states.find((item) => item.id === viewingMemoryId);
    if (state) {
      return { id: state.id, type: state.type };
    }

    if (fullMemory) {
      return { id: fullMemory.id, type: fullMemory.type as MemoryType };
    }

    return null;
  }, [fullMemory, states, viewingMemoryId]);

  const viewerState = useMemo<ViewerState>(() => {
    if (isError) return "ERROR";
    if (isLoading || !fullMemory) return "LOADING";

    const unlockAtMs = fullMemory.unlock_at ? new Date(fullMemory.unlock_at).getTime() : 0;
    const isFutureTimeCapsule = !!fullMemory.unlock_at && Number.isFinite(unlockAtMs) && currentTime < unlockAtMs;

    if (isFutureTimeCapsule) return "LOCKED";
    if (fullMemory.status === "sealed") {
      return fullMemory.is_collaborative ? "LOCKED" : "OPENING";
    }
    if (fullMemory.status === "unlocked" && fullMemory.is_collaborative) return "WAITING_PARTNER";
    if (fullMemory.status === "opening") return "OPENING";
    return "VIEWING";
  }, [currentTime, fullMemory, isError, isLoading]);

  useEffect(() => {
    if (!isViewerOpen) return;

    pausePhysics("memory-viewer");
    return () => resumePhysics("memory-viewer");
  }, [isViewerOpen, pausePhysics, resumePhysics]);

  useEffect(() => {
    if (!fullMemory?.unlock_at) return;
    const unlockAtMs = new Date(fullMemory.unlock_at).getTime();
    if (!Number.isFinite(unlockAtMs) || currentTime < unlockAtMs) return;
    if (unlockedPushNotifiedRef.current.has(fullMemory.id)) return;

    unlockedPushNotifiedRef.current.add(fullMemory.id);
    notifyPushEvent("time_capsule_unlocked", fullMemory.id);
  }, [currentTime, fullMemory]);
  useEffect(() => {
    if (!fullMemory || viewerState !== "OPENING" || fullMemory.status === "opening" || fullMemory.is_collaborative) {
      return;
    }

    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.from("memories").update({ status: "opening" }).eq("id", fullMemory.id).then(() => {
        window.dispatchEvent(new CustomEvent("memory-opened", { detail: { id: fullMemory.id } }));
      });
    });
  }, [fullMemory, viewerState]);

  useEffect(() => {
    if (!viewingMemoryId) return;
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [viewingMemoryId]);

  useEffect(() => {
    const handleForceClose = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      if (viewingMemoryId && customEvent.detail.id === viewingMemoryId) {
        closeViewer();
      }
    };

    window.addEventListener("viewer-force-close", handleForceClose);
    return () => window.removeEventListener("viewer-force-close", handleForceClose);
  }, [viewingMemoryId, closeViewer]);

  const isCreator = !!profile && !!fullMemory && fullMemory.created_by === profile.id;

  const handleCapsuleDelete = async () => {
    if (!fullMemory) return;
    const memoryId = fullMemory.id;
    closeViewer();

    capsuleDeleteTimerRef.current = window.setTimeout(async () => {
      capsuleDeleteTimerRef.current = null;
      try {
        await memoryService.deleteMemory(memoryId);
        removeMemory(memoryId);
        queryClient.invalidateQueries({ queryKey: ["memories"] });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
        queryClient.removeQueries({ queryKey: ["memory", memoryId] });
      } catch {
        toast.error("Failed to delete memory.");
      }
    }, 10000);

    toast("Memory moved to trash", {
      description: "Undo is available for 10 seconds.",
      action: {
        label: "Undo",
        onClick: () => {
          if (capsuleDeleteTimerRef.current) window.clearTimeout(capsuleDeleteTimerRef.current);
          capsuleDeleteTimerRef.current = null;
        },
      },
      duration: 10000,
      className: "font-cormorant text-lg bg-zinc-900 text-white border-zinc-800",
    });
  };

  useEffect(() => (
    () => {
      if (capsuleDeleteTimerRef.current) window.clearTimeout(capsuleDeleteTimerRef.current);
    }
  ), []);

  if (typeof document === "undefined") return null;

  const portal = createPortal(
    <AnimatePresence>
      {viewingMemoryId && activeMemoryState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(210,188,142,0.12),transparent_46%),rgba(12,25,19,0.82)] pointer-events-auto"
            onClick={closeViewer}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(18,100,82,0.12)_0%,_transparent_70%)] pointer-events-none" />
          </motion.div>

          <motion.div
            key={`memory-${activeMemoryState.id}`}
            layoutId={!navigateDirection ? `memory-${activeMemoryState.id}` : undefined}
            custom={navigateDirection}
            variants={{
              initial: (direction: "next" | "prev" | null) => ({
                x: direction === "next" ? 500 : direction === "prev" ? -500 : 0,
                opacity: direction ? 0 : 1,
                rotate: 0,
                scale: direction ? 0.8 : 1,
                filter: "blur(0px)",
              }),
              animate: { x: 0, y: 0, opacity: 1, rotate: 0, rotateX: 0, rotateZ: 0, scale: 1, filter: "blur(0px)" },
              exit: (direction: "next" | "prev" | null) => ({
                x: direction === "next" ? -500 : direction === "prev" ? 500 : 0,
                ...(direction ? { opacity: 0, scale: 0.8, filter: "blur(3px)" } : getCloseMotion(activeMemoryState.type)),
              }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            className={isPhone ? "relative z-10 h-[100dvh] w-full overflow-y-auto overscroll-contain pointer-events-auto mobile-safe-y" : "relative z-10 pointer-events-auto"}
            transition={{ type: "spring", damping: 26, stiffness: 150, mass: 0.9 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {viewerState === "LOADING" && (
              <div className="flex h-full flex-col items-center justify-center rounded-none bg-white/5 p-12 shadow-2xl backdrop-blur-md dark:bg-black/20 sm:rounded-3xl">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-zinc-400">Loading memory...</p>
              </div>
            )}

            {viewerState === "ERROR" && (
              <div className="flex h-full flex-col items-center justify-center rounded-none bg-white/5 p-12 text-center shadow-2xl backdrop-blur-md dark:bg-black/20 sm:rounded-3xl">
                <p className="mb-4 text-rose-400">Could not load this memory.</p>
                <button onClick={closeViewer} className="rounded-full bg-zinc-800 px-6 py-2 text-white">
                  Close
                </button>
              </div>
            )}

            {(viewerState === "LOCKED" || viewerState === "WAITING_PARTNER") && fullMemory && (
              <TimeCapsuleViewer
                memory={fullMemory}
                onClose={closeViewer}
                onEdit={isCreator ? () => setIsEditingCapsule(true) : undefined}
                onDelete={isCreator ? handleCapsuleDelete : undefined}
              />
            )}

            {(viewerState === "OPENING" || viewerState === "VIEWING") && fullMemory && (
              <ViewerAnimation
                key={`anim-${activeMemoryState.id}`}
                memoryId={activeMemoryState.id}
                type={activeMemoryState.type}
                fullMemory={fullMemory}
                onClose={closeViewer}
                stage={viewerState === "VIEWING" || navigateDirection ? "viewing" : "opening"}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      {portal}
      {isEditingCapsule && fullMemory && (
        <EditMemoryModal
          memory={fullMemory}
          onClose={() => {
            setIsEditingCapsule(false);
            queryClient.invalidateQueries({ queryKey: ["memory", fullMemory.id] });
          }}
        />
      )}
    </>
  );
}

