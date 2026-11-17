import { Heart } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--surface-base)] transition-colors duration-700">
      
      <div className="relative flex flex-col items-center justify-center p-8 z-10">
        <div className="relative flex items-center justify-center mb-6">
          <Heart className="w-8 h-8 text-[var(--accent-rose)] fill-[var(--accent-rose-soft)]" />
        </div>

        <h2 className="font-cormorant text-2xl md:text-3xl tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-2 opacity-80">
          The Memory Jar
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-8 h-px bg-[var(--border-soft)]" />
          <span className="text-[9px] tracking-[0.16em] uppercase text-[var(--text-muted)] font-medium">
            Gathering Memories
          </span>
          <div className="w-8 h-px bg-[var(--border-soft)]" />
        </div>
      </div>
    </div>
  );
}
