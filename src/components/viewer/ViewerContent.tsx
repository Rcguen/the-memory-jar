import { Memory, MemoryAttachment } from "@/types/memory";
import { format } from "date-fns";
import { X, ChevronLeft, ChevronRight, AlertCircle, Heart, MessageCircle, Share2, Download, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";
import { usePhysics } from "@/providers/physics-provider";
import { AudioPlayer } from "./AudioPlayer";
import { PhotoGallery } from "./PhotoGallery";
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
import { EmojiText } from "@/components/ui/EmojiText";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useHaptics } from "@/hooks/useHaptics";
import { useNativeShare } from "@/hooks/useNativeShare";
import { ReactionEmoji } from "@/types/memory";

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
  const isPhone = useIsPhone();
  const { trigger } = useHaptics();
  const { canShare, share } = useNativeShare();
  
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isActionRailExpanded, setIsActionRailExpanded] = useState(false);
  const [readingModeDismissedFor, setReadingModeDismissedFor] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const commentsAnchorRef = useRef<HTMLDivElement | null>(null);

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

  const attachments = fullMemory?.attachments ?? [];
  const photoAttachments = attachments.filter((attachment) => attachment.file_type === "photo");
  const thumbnailAttachments = attachments.filter((attachment) => attachment.file_type === "thumbnail");
  const playableAttachments = attachments.filter((attachment) => attachment.file_type === "voice" || attachment.file_type === "video");
  const quickReactions: ReactionEmoji[] = ["❤️", "🥹", "😂", "😍"];
  const shouldFocusRead =
    isPhone &&
    !!fullMemory?.content &&
    fullMemory.content.length > 420 &&
    ["letter", "promise", "wish", "gratitude", "random_thought", "travel"].includes(fullMemory.type);
  const isReadingMode = shouldFocusRead && readingModeDismissedFor !== memoryId;

  const handleCommentJump = () => {
    commentsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFavorite = async () => {
    if (!fullMemory) return;
    trigger("light");
    try {
      await memoryService.setFavorite(fullMemory.id, !fullMemory.is_favorite);
      await queryClient.invalidateQueries({ queryKey: ["memory", fullMemory.id] });
      await queryClient.invalidateQueries({ queryKey: ["memories"] });
      await queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    } catch (error) {
      toast.error(`Favorite failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleReaction = async (emoji: ReactionEmoji) => {
    if (!fullMemory) return;
    trigger("light");
    try {
      await memoryService.setReaction(fullMemory.id, emoji);
      setIsActionRailExpanded(false);
      await queryClient.invalidateQueries({ queryKey: ["memory", fullMemory.id] });
      await queryClient.invalidateQueries({ queryKey: ["memories"] });
      await queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    } catch (error) {
      toast.error(`Reaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleShare = async () => {
    if (!fullMemory) return;
    trigger("light");
    const shared = await share({
      title: fullMemory.title || "A memory from The Memory Jar",
      text: fullMemory.content || fullMemory.title || "A memory from The Memory Jar",
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });

    if (!shared && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.href : fullMemory.title || "");
      toast.success("Link copied.");
    }
  };

  const handleDownload = async () => {
    if (!attachments[0]) return;
    trigger("light");
    try {
      const url = await memoryService.getAttachmentUrlAsync(attachments[0].file_type, attachments[0].url);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachments[0].url.split("/").pop() || "memory-attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

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
      "relative mx-auto flex h-[100dvh] w-full max-h-[100dvh] flex-col overflow-hidden sm:max-h-[80vh]",
      paper.borderRadius,
      theme.backgroundClass,
      theme.borderClass,
      theme.fontClass,
      paper.shadow,
      isPhone && "rounded-none border-x-0 border-y-0 shadow-none"
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
      <div className={cn("absolute right-4 top-4 z-50 flex items-center gap-2", isPhone && "top-[calc(env(safe-area-inset-top)+0.75rem)]")}>
        
        {/* Creator Menu */}
        {profile?.id === fullMemory.created_by && (
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="min-h-11 min-w-11 rounded-full bg-black/5 p-3 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
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
          className="min-h-11 min-w-11 rounded-full bg-black/5 p-3 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <X className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Header */}
      <div className={cn("relative z-10 flex-shrink-0 border-b border-black/5 bg-inherit pb-6 dark:border-white/5", paper.padding, isPhone && "sticky top-0 px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.2rem)] backdrop-blur-xl")}>
        <p className={cn("text-sm font-medium tracking-widest uppercase mb-2 opacity-50", theme.textClass)}>
          {format(new Date(fullMemory.memory_date), "MMMM do, yyyy")}
          {fullMemory.is_pinned && (
            <span className="ml-3 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </p>
        <h2 className={cn("font-semibold", theme.textClass, isPhone ? "max-w-[18rem] text-[2.5rem] leading-[0.92]" : "text-4xl")}>
          <EmojiText text={fullMemory.title || "Untitled memory"} />
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className={cn("relative z-10 flex-1 overflow-y-auto custom-scrollbar space-y-6", paper.padding, isPhone ? "px-5 pb-40 pt-6" : "pt-8")}>
        
        {/* Main Text Content */}
        {fullMemory.content && (
          <div className={cn("prose prose-zinc dark:prose-invert prose-p:leading-relaxed", isPhone ? "mx-auto max-w-[32rem] prose-lg prose-p:text-[1.07rem] prose-p:leading-8" : "prose-lg")}>
            <p className={cn("whitespace-pre-wrap font-light", theme.textClass)}>
              <EmojiText text={fullMemory.content} />
            </p>
          </div>
        )}

        <PhotoGallery attachments={photoAttachments} />
        {playableAttachments.map((attachment) => (
          <AttachmentRenderer
            key={attachment.id}
            attachment={attachment}
            thumbnail={attachment.file_type === "video" ? thumbnailAttachments[0] : undefined}
          />
        ))}
      </div>

      {/* Footer & Navigation */}
      <div className={cn("relative z-10 flex items-center justify-between border-t border-black/5 bg-black/[0.02] py-6 dark:border-white/5 dark:bg-white/[0.02]", paper.padding, isPhone && "hidden")}>
        
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

      <div ref={commentsAnchorRef} />
      {!isReadingMode && <MemoryComments memoryId={memoryId} />}

      {isPhone && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="pointer-events-auto rounded-[1.6rem] border border-white/10 bg-zinc-950/78 p-2 shadow-[0_-14px_40px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            {isActionRailExpanded && (
              <div className="mb-2 flex items-center justify-center gap-2 rounded-[1.2rem] bg-white/[0.04] p-2">
                {quickReactions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReaction(emoji)}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/[0.06] text-xl text-white transition active:scale-[0.96]"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={handleFavorite}
                className={cn("flex min-h-[52px] flex-col items-center justify-center rounded-[1.1rem] text-[11px] font-medium text-zinc-300", fullMemory.is_favorite ? "bg-rose-500/18 text-rose-100" : "bg-white/[0.05]")}
              >
                <Heart className={cn("mb-1 h-4 w-4", fullMemory.is_favorite ? "text-rose-300" : "text-zinc-300")} />
                Favorite
              </button>
              <button
                type="button"
                onClick={() => setIsActionRailExpanded((value) => !value)}
                className={cn("flex min-h-[52px] flex-col items-center justify-center rounded-[1.1rem] bg-white/[0.05] text-[11px] font-medium text-zinc-300", isActionRailExpanded && "bg-amber-400/16 text-amber-100")}
              >
                <Sparkles className="mb-1 h-4 w-4 text-amber-300" />
                React
              </button>
              <button
                type="button"
                onClick={handleCommentJump}
                className="flex min-h-[52px] flex-col items-center justify-center rounded-[1.1rem] bg-white/[0.05] text-[11px] font-medium text-zinc-300"
              >
                <MessageCircle className="mb-1 h-4 w-4 text-emerald-300" />
                Comment
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex min-h-[52px] flex-col items-center justify-center rounded-[1.1rem] bg-white/[0.05] text-[11px] font-medium text-zinc-300"
              >
                <Share2 className="mb-1 h-4 w-4 text-sky-300" />
                {canShare ? "Share" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={attachments.length === 0}
                className="flex min-h-[52px] flex-col items-center justify-center rounded-[1.1rem] bg-white/[0.05] text-[11px] font-medium text-zinc-300 disabled:opacity-40"
              >
                <Download className="mb-1 h-4 w-4 text-amber-200" />
                Save
              </button>
            </div>

            {isReadingMode && (
              <button
                type="button"
                onClick={() => setReadingModeDismissedFor(memoryId)}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-white/[0.05] px-4 text-sm text-zinc-200"
              >
                Show comments and details
              </button>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <EditMemoryModal 
          memory={fullMemory} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}

function AttachmentRenderer({ attachment, thumbnail }: { attachment: MemoryAttachment; thumbnail?: MemoryAttachment }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['attachmentUrl', attachment.id, attachment.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(attachment.file_type, attachment.url),
    staleTime: 1000 * 60 * 30, // Cache signed URLs for 30 minutes
  });
  const { data: thumbnailUrl } = useQuery({
    queryKey: ['attachmentUrl', thumbnail?.id, thumbnail?.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(thumbnail!.file_type, thumbnail!.url),
    staleTime: 1000 * 60 * 30,
    enabled: !!thumbnail,
  });

  if (isLoading || !url) {
    return <div className="w-full h-32 bg-black/5 dark:bg-white/5 animate-pulse rounded-xl" />;
  }

  if (attachment.file_type === "voice") {
    return <AudioPlayer url={url} />;
  }
  if (attachment.file_type === "video") {
    return <VideoPlayer url={url} poster={thumbnailUrl} />;
  }
  return null;
}
