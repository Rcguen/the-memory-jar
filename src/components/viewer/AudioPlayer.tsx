import { useEffect, useRef, useState } from "react";
import { Play, Pause, FastForward, Rewind } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAudioWaveform } from "@/hooks/useAudioWaveform";

interface AudioPlayerProps {
  url: string;
}

export function AudioPlayer({ url }: AudioPlayerProps) {
  return <AudioPlayerBody key={url} url={url} />;
}

function AudioPlayerBody({ url }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const isResolvingFirstPlayback = isPlaying && !hasDuration;
  const showLoadingState = isLoading || isResolvingFirstPlayback;
  const waveform = useAudioWaveform(url, 54);

  const syncProgress = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = audio.duration;
    setCurrentTime(audio.currentTime);
    if (Number.isFinite(total) && total > 0) {
      setDuration(total);
      setProgress((audio.currentTime / total) * 100);
      return;
    }
    setProgress(0);
  };

  const syncBuffered = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = audio.duration;
    if (!Number.isFinite(total) || total <= 0 || audio.buffered.length === 0) {
      setBufferedProgress(0);
      return;
    }

    let bufferedEnd = 0;
    for (let index = 0; index < audio.buffered.length; index += 1) {
      const start = audio.buffered.start(index);
      const end = audio.buffered.end(index);
      if (audio.currentTime >= start && audio.currentTime <= end) {
        bufferedEnd = end;
        break;
      }
      bufferedEnd = Math.max(bufferedEnd, end);
    }

    setBufferedProgress(Math.max(0, Math.min(100, (bufferedEnd / total) * 100)));
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
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        setIsLoading(true);
      }
      await audio.play();
      syncBuffered();
    } catch (error) {
      console.error("[AudioPlayer] play failed:", error);
      setIsPlaying(false);
      toast.error("Could not play this voice recording.");
    }
  };

  const handleTimeUpdate = () => {
    syncProgress();
  };

  const skipBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined;
    const nextTime = total
      ? Math.min(total, Math.max(0, audio.currentTime + seconds))
      : Math.max(0, audio.currentTime + seconds);
    audio.currentTime = nextTime;
    syncProgress();
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${rest.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative mt-5 w-full overflow-hidden rounded-[1.35rem] border border-amber-200/25 bg-[#1a1714] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_70px_rgba(0,0,0,0.35)] sm:mt-6 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(245,188,102,0.15),transparent_35%),linear-gradient(135deg,rgba(255,244,215,0.06),transparent_38%),repeating-linear-gradient(90deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_6px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-amber-100/30" />

      <div className="relative rounded-[1rem] border border-amber-100/10 bg-[linear-gradient(160deg,#2a241d,#151515_52%,#241b16)] p-3 sm:p-5">
        <div className="absolute inset-2 rounded-[0.8rem] border border-black/30 pointer-events-none" />

        <div className="relative mx-auto mb-4 w-[88%] max-w-xl -rotate-1 rounded-md border border-amber-700/35 bg-[#e9dcc9] px-3 py-2 text-center shadow-[0_4px_14px_rgba(0,0,0,0.28)] sm:mb-5 sm:w-3/4">
          <div className="absolute inset-x-4 top-1 border-t border-amber-900/10" />
          <p className="font-cormorant text-sm font-semibold tracking-[0.18em] text-stone-700 sm:text-base">
            MEMORY TAPE
          </p>
        </div>

        <div className="relative mx-auto mb-4 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:mb-5 sm:gap-6">
          <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-stone-700 to-stone-500 shadow-inner" />
          <div className="relative flex items-center gap-7 rounded-full border border-amber-100/10 bg-black/35 px-6 py-3 shadow-[inset_0_0_18px_rgba(0,0,0,0.55)] sm:gap-12 sm:px-9 sm:py-4">
            {[0, 1].map((index) => (
              <motion.div
                key={index}
                animate={{ rotate: isPlaying ? 360 : 0, opacity: showLoadingState ? [0.62, 1, 0.62] : 1 }}
                transition={{
                  rotate: { duration: 3.2, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 1, repeat: showLoadingState ? Infinity : 0, delay: index * 0.14 },
                }}
                className="relative flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-stone-600 bg-[#121212] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.04)] sm:h-16 sm:w-16"
              >
                <span className="absolute h-px w-8 bg-stone-500/70 sm:w-10" />
                <span className="absolute h-8 w-px bg-stone-500/70 sm:h-10" />
                <span className="h-4 w-4 rounded-full border border-stone-600 bg-black shadow-inner sm:h-5 sm:w-5" />
              </motion.div>
            ))}
            <div className="absolute inset-x-10 bottom-3 h-1 rounded-full bg-stone-900 shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
          </div>
          <div className="h-2 rounded-full bg-gradient-to-l from-transparent via-stone-700 to-stone-500 shadow-inner" />
        </div>

      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={url} 
        preload="auto"
        playsInline
        onLoadStart={() => setIsLoading(true)}
        onLoadedMetadata={(event) => {
          const total = event.currentTarget.duration;
          if (Number.isFinite(total) && total > 0) setDuration(total);
          setIsLoading(false);
          syncProgress();
          syncBuffered();
        }}
        onLoadedData={() => {
          syncProgress();
          syncBuffered();
        }}
        onDurationChange={() => {
          syncProgress();
          syncBuffered();
        }}
        onCanPlay={(event) => {
          const total = event.currentTarget.duration;
          if (Number.isFinite(total) && total > 0) setDuration(total);
          setIsLoading(false);
          syncProgress();
          syncBuffered();
        }}
        onCanPlayThrough={() => {
          setIsLoading(false);
          syncBuffered();
        }}
        onProgress={syncBuffered}
        onWaiting={() => setIsLoading(true)}
        onSeeking={() => setIsLoading(true)}
        onSeeked={() => {
          setIsLoading(false);
          syncProgress();
          syncBuffered();
        }}
        onStalled={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
          startProgressLoop();
          syncBuffered();
        }}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          setIsPlaying(true);
          startProgressLoop();
          syncBuffered();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopProgressLoop();
          setIsLoading(false);
          syncProgress();
          syncBuffered();
        }}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0;
          stopProgressLoop();
          setCurrentTime(0);
          setProgress(0);
          setIsPlaying(false);
          setIsLoading(false);
          syncBuffered();
        }}
        onError={(event) => {
          const error = event.currentTarget.error;
          console.error("[AudioPlayer] audio error:", error?.code, error?.message);
          setIsLoading(false);
        }}
        className="hidden"
      />

        <div className="relative flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => skipBy(-5)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-100/10 bg-black/25 text-stone-300 transition hover:bg-amber-100/10 hover:text-amber-50 active:scale-95 sm:h-11 sm:w-11"
          aria-label="Rewind 5 seconds"
        >
          <Rewind className="h-5 w-5 fill-current" />
        </button>
        
        <button 
          type="button"
          onClick={togglePlay}
          disabled={isLoading && !isPlaying}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/35 bg-emerald-600 text-white shadow-[0_12px_26px_rgba(5,150,105,0.28),inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:bg-emerald-500 active:scale-95 disabled:opacity-60 sm:h-16 sm:w-16"
        >
          {isLoading && !isPlaying ? (
            <span className="block h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin sm:h-7 sm:w-7" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6 fill-current sm:h-7 sm:w-7" />
          ) : (
            <Play className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7" />
          )}
        </button>
        
        <button
          type="button"
          onClick={() => skipBy(5)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-100/10 bg-black/25 text-stone-300 transition hover:bg-amber-100/10 hover:text-amber-50 active:scale-95 sm:h-11 sm:w-11"
          aria-label="Forward 5 seconds"
        >
          <FastForward className="h-5 w-5 fill-current" />
        </button>
      </div>

        <div className="relative mt-4 overflow-hidden rounded-[1rem] border border-black/20 bg-stone-900/70 px-3 py-3 shadow-inner sm:mt-5">
          {showLoadingState && !hasDuration && (
            <motion.div
              className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent"
              initial={{ x: "-120%" }}
              animate={{ x: "420%" }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <div className="relative flex h-16 items-end gap-[3px] sm:h-20">
            {waveform.map((sample, index) => {
              const ratio = waveform.length <= 1 ? 0 : index / (waveform.length - 1);
              const played = progress >= ratio * 100;
              const buffered = bufferedProgress >= ratio * 100;
              const activeHeight = 18 + sample * 42;

              return (
                <motion.span
                  key={index}
                  className="relative block flex-1 rounded-full"
                  style={{
                    height: `${activeHeight}px`,
                    background: played
                      ? "linear-gradient(180deg, rgba(110,231,183,0.98), rgba(251,191,36,0.94))"
                      : buffered
                        ? "rgba(168,162,158,0.85)"
                        : "rgba(68,64,60,0.85)",
                  }}
                  animate={
                    isPlaying
                      ? { scaleY: [1, 1 + sample * 0.1, 1], opacity: [0.92, 1, 0.92] }
                      : { scaleY: 1, opacity: 0.96 }
                  }
                  transition={{
                    duration: 0.45 + ((index % 6) * 0.04),
                    repeat: isPlaying ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                />
              );
            })}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 rounded-[0.8rem] border-r border-amber-100/30 bg-gradient-to-r from-emerald-400/10 via-transparent to-transparent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-stone-400">
          <span>{formatTime(currentTime)}</span>
          <span>{showLoadingState && !hasDuration ? "loading..." : formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
