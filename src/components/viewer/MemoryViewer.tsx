"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { usePhysics } from "@/providers/physics-provider";
import { MemoryType, Memory } from "@/types/memory";
import { ViewerAnimation } from "./ViewerAnimation";
import { TimeCapsuleViewer } from "./TimeCapsuleViewer";
import { EditMemoryModal } from "../jar/EditMemoryModal";
import { useMemory } from "@/hooks/useMemoryData";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ViewerState = 'LOADING' | 'LOCKED' | 'WAITING_PARTNER' | 'OPENING' | 'VIEWING' | 'ERROR';

export function MemoryViewer() {
  const { viewingMemoryId, navigateDirection, closeViewer } = useMemoryViewer();
  const { states } = usePhysics();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingCapsule, setIsEditingCapsule] = useState(false);
  
  // We need a stable reference to the type even when closing and viewingMemoryId is null
  const [activeMemoryState, setActiveMemoryState] = useState<{ id: string, type: MemoryType } | null>(null);
  
  const { data: fullMemory, isLoading, isError } = useMemory(viewingMemoryId);
  const [viewerState, setViewerState] = useState<ViewerState>('LOADING');

  // Sync physics type to activeMemoryState during render (React safe way to derive state)
  if (viewingMemoryId && (!activeMemoryState || activeMemoryState.id !== viewingMemoryId)) {
    const state = states.find(s => s.id === viewingMemoryId);
    if (state) {
      setActiveMemoryState({ id: state.id, type: state.type });
    }
  }

  // FSM Logic
  useEffect(() => {
    if (isError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewerState('ERROR');
      return;
    }
    
    if (isLoading || !fullMemory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewerState('LOADING');
      return;
    }
    
    if (fullMemory.status === 'sealed') {
      const isTimeCapsule = fullMemory.unlock_at && new Date(fullMemory.unlock_at) > new Date();
      if (isTimeCapsule || fullMemory.is_collaborative) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewerState('LOCKED');
      } else {
        // Auto-unseal standard memories to skip the lock screen
        import("@/lib/supabase/client").then(({ createClient }) => {
          const supabase = createClient();
          supabase.from("memories").update({ status: 'opening' }).eq("id", fullMemory.id).then(() => {
            window.dispatchEvent(new CustomEvent('memory-opened', { detail: { id: fullMemory.id } }));
          });
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewerState('OPENING');
      }
    } else if (fullMemory.status === 'unlocked' && fullMemory.is_collaborative) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewerState('WAITING_PARTNER');
    } else if (fullMemory.status === 'opening') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewerState('OPENING');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewerState('VIEWING'); 
    }
  }, [fullMemory, isLoading, isError]);

  const handleClose = () => {
    closeViewer();
  };

  // Force-close listener: fired by realtime DELETE handler
  useEffect(() => {
    const handleForceClose = (e: Event) => {
      const event = e as CustomEvent<{ id: string }>;
      if (viewingMemoryId && event.detail.id === viewingMemoryId) {
        closeViewer();
      }
    };
    window.addEventListener('viewer-force-close', handleForceClose);
    return () => window.removeEventListener('viewer-force-close', handleForceClose);
  }, [viewingMemoryId, closeViewer]);

  // Creator check for locked capsule actions
  const isCreator = !!profile && !!fullMemory && fullMemory.created_by === profile.id;

  const handleCapsuleEdit = () => setIsEditingCapsule(true);

  const handleCapsuleDelete = async () => {
    if (!fullMemory) return;
    try {
      await memoryService.deleteMemory(fullMemory.id);
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.removeQueries({ queryKey: ['memory', fullMemory.id] });
      closeViewer();
      toast.success("Memory deleted.", { className: "font-cormorant text-lg bg-zinc-900 text-white border-zinc-800" });
    } catch {
      toast.error("Failed to delete memory.");
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const portal = createPortal(
    <AnimatePresence>
      {viewingMemoryId && activeMemoryState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          
          {/* Background Overlay */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 bg-zinc-950/60 pointer-events-auto"
            onClick={handleClose}
          >
            {/* Warm Spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(251,146,60,0.15)_0%,_transparent_70%)] pointer-events-none" />
          </motion.div>

          {/* Center Stage */}
          <motion.div
            key={`memory-${activeMemoryState.id}`}
            layoutId={!navigateDirection ? `memory-${activeMemoryState.id}` : undefined}
            custom={navigateDirection}
            variants={{
              initial: (dir) => ({
                x: dir === "next" ? 500 : dir === "prev" ? -500 : 0,
                opacity: dir ? 0 : 1,
                rotate: 0,
                scale: dir ? 0.8 : 1,
              }),
              animate: { x: 0, opacity: 1, rotate: 0, scale: 1 },
              exit: (dir) => ({
                x: dir === "next" ? -500 : dir === "prev" ? 500 : 0,
                opacity: dir ? 0 : 1,
                scale: dir ? 0.8 : 1,
              })
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative z-10 pointer-events-auto"
            transition={{ type: "spring", damping: 25, stiffness: 120, mass: 1 }}
          >
            {viewerState === 'LOADING' && (
              <div className="flex flex-col items-center justify-center p-12 bg-white/5 dark:bg-black/20 rounded-3xl backdrop-blur-md shadow-2xl">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                <p className="text-zinc-400">Loading memory...</p>
              </div>
            )}

            {viewerState === 'ERROR' && (
              <div className="flex flex-col items-center justify-center p-12 bg-white/5 dark:bg-black/20 rounded-3xl backdrop-blur-md shadow-2xl text-center">
                <p className="text-rose-400 mb-4">Could not load this memory.</p>
                <button onClick={handleClose} className="px-6 py-2 bg-zinc-800 text-white rounded-full">Close</button>
              </div>
            )}

            {(viewerState === 'LOCKED' || viewerState === 'WAITING_PARTNER') && fullMemory && (
              <TimeCapsuleViewer 
                memory={fullMemory} 
                onClose={handleClose}
                onEdit={isCreator ? handleCapsuleEdit : undefined}
                onDelete={isCreator ? handleCapsuleDelete : undefined}
              />
            )}

            {(viewerState === 'OPENING' || viewerState === 'VIEWING') && fullMemory && (
              <ViewerAnimation 
                key={`anim-${activeMemoryState.id}`}
                memoryId={activeMemoryState.id} 
                type={activeMemoryState.type}
                fullMemory={fullMemory}
                onClose={handleClose}
                stage={viewerState === 'VIEWING' || navigateDirection ? 'viewing' : 'opening'}
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
            queryClient.invalidateQueries({ queryKey: ['memory', fullMemory.id] });
          }}
        />
      )}
    </>
  );
}
