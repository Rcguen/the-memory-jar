import { Memory, MemoryAttachment } from "@/types/memory";
import { format } from "date-fns";
import { X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { usePhysics } from "@/providers/physics-provider";
import { AudioPlayer } from "./AudioPlayer";
import { PhotoViewer } from "./PhotoViewer";
import { VideoPlayer } from "./VideoPlayer";
import { useQuery } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import { MEMORY_THEMES, PAPER_STYLES, getDecorationPlacements, DECORATIONS } from "@/lib/memoryThemes";
import { DecorationID } from "@/types/memory";
import { EditMemoryModal } from "../jar/EditMemoryModal";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Trash2, Edit2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemoryComments } from "./MemoryComments";

interface ViewerContentProps {
  memoryId: string;
  type: string;
  fullMemory: Memory | null;
  loadError?: boolean;
  onClose: () => void;
}

export function ViewerContent({ memoryId, type, fullMemory, loadError, onClose }: ViewerContentProps) {
  void type;
  const { openViewer } = useMemoryViewer();
  const { states, removeMemory } = usePhysics();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
    };
  }, []);

  // Navigation Logic 
  const currentIndex = states.findIndex(s => s.id === memoryId);
  const nextId = currentIndex >= 0 && currentIndex < states.length - 1 ? states[currentIndex + 1].id : null;
  const prevId = currentIndex > 0 ? states[currentIndex - 1].id : null;

  const handleNext = () => {
    if (nextId) openViewer(nextId, "next");
  };
  
  const handlePrev = () => {
    if (prevId) openViewer(prevId, "prev");
  };

  const scheduleDelete = () => {
    if (!fullMemory || deleteTimerRef.current) return;

    setIsDeleteConfirming(true);
    onClose();

    deleteTimerRef.current = window.setTimeout(async () => {
      deleteTimerRef.current = null;
      try {
        await memoryService.deleteMemory(memoryId);
        removeMemory(memoryId);
        queryClient.removeQueries({ queryKey: ['memory', memoryId] });
        queryClient.invalidateQueries({ queryKey: ['memories'] });
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      } catch (err) {
        console.error("[Delete]", err);
        queryClient.invalidateQueries({ queryKey: ['memory', memoryId] });
        queryClient.invalidateQueries({ queryKey: ['memories'] });
        toast.error(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 10000);

    toast("Memory moved to trash", {
      description: "Undo is available for 10 seconds.",
      action: {
        label: "Undo",
        onClick: () => {
          if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
          deleteTimerRef.current = null;
          setIsDeleteConfirming(false);
          setIsDeleting(false);
        },
      },
      duration: 10000,
    });
  };

  // Memoized Theme and Paper calculations
  const { theme, paper, placements } = useMemo(() => {
    const themeName = fullMemory?.theme || 'modern';
    const paperName = fullMemory?.paper_style || 'letter';
    const rawDecorations = Array.isArray(fullMemory?.decorations) ? fullMemory!.decorations as DecorationID[] : [];
    
    return {
      theme: MEMORY_THEMES[themeName] || MEMORY_THEMES.modern,
      paper: PAPER_STYLES[paperName] || PAPER_STYLES.letter,
      placements: getDecorationPlacements(memoryId, rawDecorations)
    };
  }, [fullMemory, memoryId]);

  // If memory isn't fully loaded yet, show a beautiful skeleton or wait
  if (!fullMemory) {
    if (loadError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900 rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/50">
          <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">Memory Not Found</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-6">
            This memory might have been deleted, or you do not have permission to view it.
          </p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium"
          >
            Close Viewer
          </button>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900 rounded-3xl shadow-2xl border border-white/50 dark:border-zinc-800">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn(
      "relative w-full mx-auto max-h-[80vh] flex flex-col overflow-hidden",
      paper.borderRadius,
      theme.backgroundClass,
      theme.borderClass,
      theme.fontClass,
      paper.shadow
    )}>
      
      {/* Texture overlay */}
      {paper.texture && paper.texture !== "bg-transparent" && (
        <div className={cn("absolute inset-0 pointer-events-none", paper.texture)} />
      )}
      {paper.overlay && (
        <div className={cn("absolute inset-0 pointer-events-none", paper.overlay)} />
      )}
      {(!paper.texture || paper.texture === "bg-transparent") && theme.id === 'modern' && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
      )}

      {/* Deterministic Decorations */}
      {placements.map((placement) => {
        const deco = DECORATIONS.find(d => d.id === placement.id);
        if (!deco) return null;
        
        return (
          <div 
            key={`${placement.id}-${placement.style.top}-${placement.style.left}`} 
            className="absolute z-20 text-4xl drop-shadow-md pointer-events-none"
            style={placement.style}
          >
            {deco.svg}
          </div>
        );
      })}

      {/* Header Actions */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        
        {/* Creator Menu */}
        {profile?.id === fullMemory.created_by && (
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-zinc-500" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(6px)" }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden py-1 z-[100]"
                >
                <AnimatePresence mode="wait">
                  {isDeleting ? (
                  <motion.div
                    key="delete-confirm"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.16 }}
                    className="p-3 text-sm flex flex-col gap-2"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {isDeleteConfirming ? "Deleting..." : "Are you sure?"}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        disabled={isDeleteConfirming}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDeleteConfirming(true);
                          scheduleDelete();
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1 rounded transition-colors"
                      >
                        {isDeleteConfirming ? "..." : "Yes"}
                      </button>
                      <button 
                        onClick={() => setIsDeleting(false)}
                        disabled={isDeleteConfirming}
                        className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 py-1 rounded transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu-actions"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.16 }}
                  >
                    <button 
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" /> Edit Memory
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDeleting(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Memory
                    </button>
                  </motion.div>
                )}
                </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Header */}
      <div className={cn("flex-shrink-0 border-b relative z-10", paper.padding, "border-black/5 dark:border-white/5 pb-6")}>
        <p className={cn("text-sm font-medium tracking-widest uppercase mb-2 opacity-50", theme.textClass)}>
          {format(new Date(fullMemory.memory_date), "MMMM do, yyyy")}
          {fullMemory.is_pinned && (
            <span className="ml-3 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </p>
        <h2 className={cn("text-4xl font-semibold", theme.textClass)}>
          {fullMemory.title}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className={cn("flex-1 overflow-y-auto relative z-10 space-y-6", paper.padding, "pt-8")}>
        
        {/* Main Text Content */}
        {fullMemory.content && (
          <div className="prose prose-zinc dark:prose-invert prose-p:leading-relaxed prose-lg">
            <p className={cn("whitespace-pre-wrap font-light", theme.textClass)}>
              {fullMemory.content}
            </p>
          </div>
        )}

        {/* Render Attachments Dynamically */}
        {fullMemory.attachments?.map((attachment) => (
          <AttachmentRenderer key={attachment.id} attachment={attachment} />
        ))}
      </div>

      {/* Footer & Navigation */}
      <div className={cn("bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 relative z-10 flex items-center justify-between", paper.padding, "py-6")}>
        
        {/* Navigation */}
        <div className="flex gap-4">
          <button 
            onClick={handlePrev} 
            disabled={!prevId}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors group disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
          </button>
          <button 
            onClick={handleNext} 
            disabled={!nextId}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors group disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
          </button>
        </div>

        {/* Mood/Tags */}
        <div className="text-sm text-zinc-500 italic font-cormorant">
          With Love
        </div>
      </div>

      <MemoryComments memoryId={memoryId} />

      {isEditing && (
        <EditMemoryModal 
          memory={fullMemory} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}

function AttachmentRenderer({ attachment }: { attachment: MemoryAttachment }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['attachmentUrl', attachment.id, attachment.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(attachment.file_type, attachment.url),
    staleTime: 1000 * 60 * 30, // Cache signed URLs for 30 minutes
  });

  if (isLoading || !url) {
    return <div className="w-full h-32 bg-black/5 dark:bg-white/5 animate-pulse rounded-xl" />;
  }

  if (attachment.file_type === "photo") {
    return <PhotoViewer url={url} />;
  }
  if (attachment.file_type === "voice") {
    return <AudioPlayer url={url} />;
  }
  if (attachment.file_type === "video") {
    return <VideoPlayer url={url} />;
  }
  return null;
}
