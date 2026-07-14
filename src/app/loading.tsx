import { Heart } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-50/90 dark:bg-emerald-950/90 backdrop-blur-md transition-all duration-700">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-200/20 via-transparent to-transparent dark:from-emerald-800/10 pointer-events-none" />
      
      <div className="relative flex flex-col items-center justify-center p-8 z-10">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-24 h-24 rounded-full bg-emerald-400/10 dark:bg-emerald-600/10 blur-xl animate-[pulse_3s_ease-in-out_infinite]" />
          <Heart className="w-8 h-8 text-emerald-600/70 dark:text-emerald-400/70 animate-[pulse_2s_ease-in-out_infinite] drop-shadow-md fill-emerald-600/10 dark:fill-emerald-400/10" />
        </div>

        <h2 className="font-cormorant text-2xl md:text-3xl tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-2 opacity-80">
          The Memory Jar
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <span className="text-[9px] tracking-[0.25em] uppercase text-emerald-700/50 dark:text-emerald-400/50 font-medium">
            Gathering Memories
          </span>
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
