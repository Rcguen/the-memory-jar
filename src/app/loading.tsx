import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-50/95 dark:bg-emerald-950/95 backdrop-blur-xl transition-all duration-1000">
      
      {/* Soft radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-200/30 via-transparent to-transparent dark:from-emerald-800/20 pointer-events-none" />
      
      <div className="relative flex flex-col items-center justify-center p-8 z-10">
        
        {/* Animated rings */}
        <div className="relative flex w-16 h-16 items-center justify-center mb-8">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-emerald-300/30 dark:border-emerald-700/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-emerald-400/20 dark:border-emerald-600/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
          
          <div className="relative z-10 flex w-full h-full items-center justify-center bg-white/40 dark:bg-zinc-900/40 rounded-full border border-white/50 dark:border-zinc-800/50 shadow-2xl backdrop-blur-md">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600/80 dark:text-emerald-400/80" />
          </div>
        </div>

        {/* Elegant typography */}
        <h2 className="font-cormorant text-3xl md:text-4xl tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-3 opacity-90">
          The Memory Jar
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-emerald-700/60 dark:text-emerald-400/60 font-medium">
            Gathering Memories
          </span>
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
