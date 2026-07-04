import { useEffect, useRef, useState } from "react";
import { Play, Pause, FastForward, Rewind } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface AudioPlayerProps {
  url: string;
}

export function AudioPlayer({ url }: AudioPlayerProps) {
  return <AudioPlayerBody key={url} url={url} />;
}

function AudioPlayerBody({ url }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressFrameRef = useRef<number | null>(null);

  const syncProgress = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = audio.duration;
    if (Number.isFinite(total) && total > 0) {
      setDuration(total);
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / total) * 100);
      return;
    }
    setCurrentTime(0);
    setProgress(0);
  };

  const stopProgressLoop = () => {
    if (progressFrameRef.current !== null) {
      cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }
  };

  const startProgressLoop = () => {
    stopProgressLoop();
    const tick = () => {
      syncProgress();
      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
        progressFrameRef.current = requestAnimationFrame(tick);
      }
    };
    progressFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => stopProgressLoop, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }

    if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.05) {
      audio.currentTime = 0;
    }

    try {
      await audio.play();
    } catch (error) {
      console.error("[AudioPlayer] play failed:", error);
      setIsPlaying(false);
      toast.error("Could not play this voice recording.");
    }
  };

  const handleTimeUpdate = () => {
    syncProgress();
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${rest.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-zinc-800 dark:bg-zinc-900 rounded-xl p-6 mt-6 shadow-inner flex flex-col gap-4 border-2 border-zinc-700/50 relative overflow-hidden">
      
      {/* Cassette Texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none" />

      {/* Label */}
      <div className="mx-auto w-3/4 bg-amber-50 dark:bg-orange-50/90 rounded-md py-2 px-4 text-center border border-amber-200 shadow-sm z-10 font-handwriting transform -rotate-1">
        <p className="text-zinc-800 text-sm font-medium">Memory Tape</p>
      </div>

      {/* Reels */}
      <div className="flex justify-center gap-12 my-2 z-10">
        <motion.div 
          animate={{ rotate: isPlaying ? 360 : 0, opacity: isLoading ? [0.55, 1, 0.55] : 1 }} 
          transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, opacity: { duration: 1, repeat: isLoading ? Infinity : 0 } }}
          className="w-12 h-12 rounded-full border-4 border-zinc-700 flex items-center justify-center bg-zinc-800"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700" />
        </motion.div>
        <motion.div 
          animate={{ rotate: isPlaying ? 360 : 0, opacity: isLoading ? [0.55, 1, 0.55] : 1 }} 
          transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, opacity: { duration: 1, repeat: isLoading ? Infinity : 0, delay: 0.15 } }}
          className="w-12 h-12 rounded-full border-4 border-zinc-700 flex items-center justify-center bg-zinc-800"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700" />
        </motion.div>
      </div>

      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={url} 
        preload="metadata"
        playsInline
        onLoadStart={() => setIsLoading(true)}
        onLoadedMetadata={(event) => {
          const total = event.currentTarget.duration;
          if (Number.isFinite(total) && total > 0) setDuration(total);
          setIsLoading(false);
          syncProgress();
        }}
        onCanPlay={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
          startProgressLoop();
        }}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          setIsPlaying(true);
          startProgressLoop();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopProgressLoop();
          syncProgress();
        }}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0;
          stopProgressLoop();
          setCurrentTime(0);
          setProgress(0);
          setIsPlaying(false);
        }}
        onError={(event) => {
          const error = event.currentTarget.error;
          console.error("[AudioPlayer] audio error:", error?.code, error?.message);
          setIsLoading(false);
        }}
        className="hidden"
      />

      {/* Controls */}
      <div className="flex items-center justify-between mt-2 z-10">
        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Rewind className="w-5 h-5 fill-current" />
        </button>
        
        <button 
          type="button"
          onClick={togglePlay}
          disabled={isLoading && !isPlaying}
          className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          {isLoading && !isPlaying ? (
            <span className="block h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </button>
        
        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
          <FastForward className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-zinc-700 rounded-full mt-2 overflow-hidden z-10">
        <div 
          className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="z-10 -mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <span>{formatTime(currentTime)}</span>
        <span>{isLoading ? "loading..." : formatTime(duration)}</span>
      </div>
    </div>
  );
}
