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
import { Heart, MessageCircle, Pin, SmilePlus, Star, Trash2, UsersRound } from "lucide-react";
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
  const reactionTriggerRef = useRef<HTMLButtonElement>(null);

  const stop = (event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation();
  const actionClass = cn("inline-flex h-10 w-10 items-center justify-center text-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:h-9 sm:w-9", isForest ? "text-stone-100 hover:bg-white/10 hover:text-white" : "hover:bg-stone-100/80 hover:text-stone-950");
  const footerClass = isForest ? "border-white/15 bg-[#1b2922] text-stone-200" : "border-stone-700/15 bg-[#f3eee4] text-stone-700";
  const reactClass = isForest ? "text-stone-100 hover:bg-white/10" : "text-stone-800 hover:bg-stone-200/70";
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
      "group relative flex w-full flex-col overflow-visible rounded-[var(--radius-medium)] border",
      "h-[190px] sm:h-[176px]",
      isForest ? "border-emerald-100/15 bg-[#1b2922] text-stone-100" : "border-[rgba(92,75,54,0.18)] bg-[#f3eee4] text-stone-800",
      showReactions && "z-20",
    )}>
      <button type="button" onClick={onOpen} className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Open ${memory.type} memory: ${metadata.title}`} />
      
      <div className={cn("absolute right-2 top-2 z-10 flex items-center overflow-hidden rounded-[0.7rem] border shadow-sm sm:right-3 sm:top-3", isForest ? "border-white/15 bg-[#23342b]/95" : "border-stone-300/85 bg-[#fffaf0]/95")}>
        {isCollaborative && <span className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center text-emerald-800 dark:text-emerald-100" title="Shared memory"><UsersRound className="h-3.5 w-3.5" /><span className="sr-only">Shared memory</span></span>}
        {onPin && <button type="button" onClick={(event) => { stop(event); onPin(); }} className={cn(actionClass, "pointer-events-auto border-l border-stone-300/70 first:border-l-0", isForest && "border-white/15")} aria-label={isPinned ? "Unpin memory" : "Pin memory"}><Pin className={isPinned ? "h-3.5 w-3.5 fill-emerald-700 text-emerald-700" : "h-3.5 w-3.5"} /></button>}
        <button type="button" onClick={(event) => { stop(event); onFavorite(); }} className={cn(actionClass, "pointer-events-auto border-l border-stone-300/70 first:border-l-0", isForest && "border-white/15")} aria-label={isFavorite ? "Remove memory from favorites" : "Favorite memory"}><Star className={isFavorite ? "h-3.5 w-3.5 fill-rose-500 text-rose-500" : "h-3.5 w-3.5"} /></button>
        {onDelete ? <button type="button" onClick={(event) => { stop(event); onDelete(); }} className={cn(actionClass, "pointer-events-auto border-l border-stone-300/70 text-rose-600 hover:text-rose-700", isForest && "border-white/15")} aria-label="Delete memory"><Trash2 className="h-3.5 w-3.5" /></button> : !canDelete && <button type="button" disabled className={cn(actionClass, "pointer-events-auto border-l border-stone-300/70 cursor-not-allowed text-stone-400 opacity-45", isForest && "border-white/15")} aria-label="Only the memory creator can delete this memory" title="Only the memory creator can delete this memory"><Trash2 className="h-3.5 w-3.5" /></button>}
      </div>

      <div className="relative z-[1] grid flex-1 grid-cols-[72px_minmax(0,1fr)] gap-3 p-3 pb-14 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4 sm:pb-12 pointer-events-none">
        <div className={cn("min-h-0 overflow-hidden rounded-[var(--radius-small)] border", isForest ? "border-white/10 bg-[#101712]" : "border-[rgba(104,83,54,0.18)] bg-[#fffaf0]")}>{preview}</div>
        <div className="min-w-0 pt-10 sm:pt-0 sm:pr-24 flex flex-col justify-center">
          <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", isForest ? "text-emerald-100/65" : "text-stone-500")}>
            {icon}<span>{label}</span><span aria-hidden="true">Â·</span><span>{metadata.dateLabel}</span>
          </div>
          <h3 className={cn("mt-1 truncate font-cormorant text-[18px] font-semibold leading-[1.1] sm:text-[20px]", isForest ? "text-stone-50" : "text-stone-800")}><EmojiText text={metadata.title} /></h3>
          {excerpt && <div className={cn("mt-1 line-clamp-2 text-[14px] leading-5", isForest ? "text-stone-300/80" : "text-stone-600")}>{typeof excerpt === "string" ? <EmojiText text={excerpt} /> : excerpt}</div>}
          {metadata.tags && metadata.tags.length > 0 && <p className={cn("mt-1 truncate text-[11px]", isForest ? "text-emerald-100/55" : "text-stone-500")}>{metadata.tags.slice(0, 2).map((tag) => `#${tag}`).join("  ")}</p>}
        </div>
      </div>

      <footer className={cn("absolute inset-x-3 bottom-0 z-30 flex min-h-11 items-center justify-between border-t pt-1 text-[12px]", footerClass)}>
        <div className="relative pointer-events-auto">
          <button ref={reactionTriggerRef} type="button" onClick={toggleReactionMenu} className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600", isForest ? "border-white/15 bg-white/5 text-stone-100 hover:bg-white/12" : "border-stone-300/80 bg-white/45 text-stone-800 hover:bg-white", showReactions && (isForest ? "bg-emerald-100/15 text-emerald-50" : "border-emerald-700/35 bg-emerald-50 text-emerald-800"))} aria-expanded={showReactions} aria-label="Choose a reaction">{activeReaction ? <EmojiText text={activeReaction} /> : <SmilePlus className="h-3.5 w-3.5" aria-hidden="true" />}<span>{activeReaction ? `Reacted (${visibleReactionCount})` : "React"}</span></button>

        </div>
        <span className="flex items-center gap-2" aria-label={`${affectionCount} favorites and reactions, and ${metadata.comments} comments`}>
          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{affectionCount}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{metadata.comments}</span>
        </span>
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




