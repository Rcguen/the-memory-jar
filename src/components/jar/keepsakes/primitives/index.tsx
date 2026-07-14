"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmojiText } from "@/components/ui/EmojiText";
import type { KeepsakeSlotProps } from "../types";

export function PaperSurface({ children, className }: KeepsakeSlotProps) { return <section className={cn("surface-paper", className)}>{children}</section>; }
export function NotebookSurface({ children, className }: KeepsakeSlotProps) { return <section className={cn("surface-paper bg-[repeating-linear-gradient(0deg,transparent_0_1.5rem,rgba(87,110,132,0.12)_1.5rem_1.56rem)]", className)}>{children}</section>; }
export function PostcardSurface({ children, className }: KeepsakeSlotProps) { return <section className={cn("surface-paper border-dashed", className)}>{children}</section>; }
export function PhotoFrame({ children, className }: KeepsakeSlotProps) { return <figure className={cn("bg-white shadow-[var(--shadow-1)]", className)}>{children}</figure>; }
export function FilmFrame({ children, className }: KeepsakeSlotProps) { return <figure className={cn("bg-zinc-950 text-white", className)}>{children}</figure>; }
export function CassetteFace({ children, className }: KeepsakeSlotProps) { return <section className={cn("rounded-[var(--radius-small)] bg-zinc-900 text-zinc-100", className)}>{children}</section>; }
export function WaxSeal({ label = "Sealed" }: { label?: string }) { return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-700 text-[9px] font-semibold text-rose-50 shadow-sm">{label}</span>; }
export function MetadataRow({ children, className }: KeepsakeSlotProps) { return <div className={cn("type-meta flex items-center gap-2", className)}>{children}</div>; }
export function KeepsakeFooter({ children, className }: KeepsakeSlotProps) { return <footer className={cn("flex items-center justify-between", className)}>{children}</footer>; }
export function KeepsakeActions({ children, className }: KeepsakeSlotProps) { return <div className={cn("flex items-center gap-1", className)}>{children}</div>; }

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, MessageCircle, Pin, SmilePlus, Star, Trash2, UsersRound, MoreHorizontal } from "lucide-react";
import type { KeepsakeLayoutProps } from "../types";
import type { ReactionEmoji } from "@/types/memory";

const REACTIONS: ReactionEmoji[] = ["❤️", "🥹", "😂", "😭", "😍", "🔥"];

type CompactKeepsakeShellProps = KeepsakeLayoutProps & {
  preview: ReactNode;
  icon: ReactNode;
  label: string;
  excerpt?: ReactNode;
  tone?: "paper" | "forest";
};

export function CompactKeepsakeShell(props: CompactKeepsakeShellProps) {
  const { preview, icon, label, excerpt, tone = "paper", memory, metadata, isCollaborative, isFavorite, isPinned, onFavorite, onPin, onDelete, canDelete = true, onReaction, onOpen } = props;
  const isForest = tone === "forest";
  
  const [showReactions, setShowReactions] = useState(false);
  const [reactionMenuPosition, setReactionMenuPosition] = useState<{ bottom: number; left: number } | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<ReactionEmoji | null>(metadata.reaction ?? null);
  const [showOverflow, setShowOverflow] = useState(false);
  const reactionTriggerRef = useRef<HTMLButtonElement>(null);

  const stop = (event: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>) => event.stopPropagation();
  const actionClass = cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600", isForest ? "text-stone-300 hover:bg-white/10 hover:text-white" : "text-stone-500 hover:bg-stone-200 hover:text-stone-900");
  const footerClass = isForest ? "border-white/15 bg-[#1b2922] text-stone-200" : "border-[rgba(92,75,54,0.18)] bg-[#f3eee4] text-stone-700";
  const activeReaction = metadata.reaction ?? selectedReaction;
  const visibleReactionCount = Math.max(metadata.reactions ?? 0, activeReaction ? 1 : 0);
  const affectionCount = metadata.favorites + visibleReactionCount;
  const toggleReactionMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    stop(event);
    if (showReactions) {
      setShowReactions(false);
      return;
    }
    const rect = reactionTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      setReactionMenuPosition({
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 246)),
      });
    }
    setShowReactions(true);
  };

  return (
    <>
    <article className={cn(
      "group relative flex w-full flex-col overflow-visible rounded-xl border transition-shadow hover:shadow-[var(--shadow-1)]",
      isForest ? "border-emerald-100/15 bg-[#1b2922] text-stone-100" : "border-[rgba(92,75,54,0.18)] bg-[#fdfbf7] text-stone-800",
      (showReactions || showOverflow) && "z-20",
    )}>
      <button type="button" onClick={onOpen} className="relative z-0 flex w-full flex-col items-start rounded-t-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:bg-stone-500/5 transition-colors" aria-label={`Open ${memory.type} memory: ${metadata.title}`}>
        <div className="relative flex w-full p-3 gap-3 sm:p-4 sm:gap-4 pointer-events-none">
          <div className={cn("w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden rounded-[var(--radius-small)] border", isForest ? "border-white/10 bg-[#101712]" : "border-[rgba(104,83,54,0.18)] bg-[#fffaf0]")}>{preview}</div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className={cn("flex items-center gap-1.5 text-[11px] font-medium tracking-wide", isForest ? "text-emerald-100/65" : "text-stone-500")}>
              {icon}<span>{label}</span><span aria-hidden="true">·</span><span>{metadata.dateLabel}</span>
              {isCollaborative && <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-emerald-600" title="Shared memory"><UsersRound className="h-3 w-3" /><span className="sr-only">Shared memory</span></span>}
            </div>
            <h3 className={cn("mt-0.5 truncate font-cormorant text-[18px] font-semibold leading-tight sm:text-[20px]", isForest ? "text-stone-50" : "text-stone-800")}><EmojiText text={metadata.title} /></h3>
            {excerpt && <div className={cn("mt-0.5 line-clamp-1 text-[13px] leading-snug", isForest ? "text-stone-300/80" : "text-stone-600")}>{typeof excerpt === "string" ? <EmojiText text={excerpt} /> : excerpt}</div>}
            {metadata.tags && metadata.tags.length > 0 && <p className={cn("mt-1 truncate text-[11px]", isForest ? "text-emerald-100/55" : "text-stone-500")}>{metadata.tags.slice(0, 2).map((tag) => `#${tag}`).join("  ")}</p>}
          </div>
        </div>
      </button>

      <footer className={cn("relative z-10 flex min-h-[2.75rem] items-center justify-between border-t px-2 py-1.5 text-[12px] rounded-b-xl", footerClass)}>
         <div className="flex items-center gap-0.5">
           {onPin && <button onClick={(e) => { stop(e); onPin(); }} className={actionClass} aria-label={isPinned ? "Unpin memory" : "Pin memory"}><Pin className={isPinned ? "h-3.5 w-3.5 fill-emerald-700 text-emerald-700" : "h-3.5 w-3.5"} /></button>}
           <button onClick={(e) => { stop(e); onFavorite(); }} className={actionClass} aria-label={isFavorite ? "Remove memory from favorites" : "Favorite memory"}><Star className={isFavorite ? "h-3.5 w-3.5 fill-rose-500 text-rose-500" : "h-3.5 w-3.5"} /></button>
           
           <button ref={reactionTriggerRef} type="button" onClick={toggleReactionMenu} className={cn("ml-1.5 inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600", isForest ? "border-white/15 bg-white/5 text-stone-100 hover:bg-white/12" : "border-stone-300/80 bg-white/45 text-stone-800 hover:bg-white", showReactions && (isForest ? "bg-emerald-100/15 text-emerald-50" : "border-emerald-700/35 bg-emerald-50 text-emerald-800"))} aria-expanded={showReactions} aria-label="Choose a reaction">
             {activeReaction ? <EmojiText text={activeReaction} /> : <SmilePlus className="h-3.5 w-3.5" aria-hidden="true" />}<span className="hidden sm:inline-block">{activeReaction ? `Reacted (${visibleReactionCount})` : "React"}</span>
           </button>
         </div>
         
         <div className="flex items-center gap-2.5 px-1 pr-0.5">
           <span className="flex items-center gap-1 font-medium text-stone-500" aria-label={`${affectionCount} favorites and reactions`}><Heart className="h-3.5 w-3.5" />{affectionCount}</span>
           <span className="flex items-center gap-1 font-medium text-stone-500" aria-label={`${metadata.comments} comments`}><MessageCircle className="h-3.5 w-3.5" />{metadata.comments}</span>
           
           {(onDelete || !canDelete) && (
             <div className="relative ml-1.5 border-l border-stone-300/30 pl-1.5">
                <button onClick={(e) => { stop(e); setShowOverflow(!showOverflow); }} className={actionClass} aria-label="More actions" aria-expanded={showOverflow}><MoreHorizontal className="h-4 w-4" /></button>
                {showOverflow && (
                   <div className={cn("absolute bottom-full right-0 mb-2 rounded-md border shadow-lg p-1 w-32", isForest ? "border-stone-600 bg-[#2a3c31]" : "border-stone-200 bg-white")}>
                      <button onClick={(e) => { stop(e); setShowOverflow(false); if(onDelete) onDelete(); }} disabled={!canDelete} className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                   </div>
                )}
             </div>
           )}
         </div>
      </footer>
    </article>
      {showReactions && reactionMenuPosition && typeof document !== "undefined" && createPortal(
        <div
          role="menu"
          className="fixed z-[250] flex rounded-[var(--radius-small)] border border-stone-300 bg-[#fffaf0] p-1 text-stone-800 shadow-[var(--shadow-floating)]"
          style={{ bottom: reactionMenuPosition.bottom, left: reactionMenuPosition.left }}
        >
          {REACTIONS.map((emoji) => (
            <button key={emoji} type="button" role="menuitem" onClick={() => { setSelectedReaction(emoji); onReaction(emoji); setShowReactions(false); }} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-lg hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={`React with ${emoji}`}><EmojiText text={emoji} /></button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}




