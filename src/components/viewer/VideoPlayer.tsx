import { useState, useRef, useEffect } from "react";
import { Play, Pause, Maximize2, Minimize2, Loader2, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (error) {
    return (
      <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl p-8 mt-6 flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 text-zinc-500">
        <p className="text-sm">Video could not be loaded</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full bg-black rounded-xl mt-6 shadow-xl flex flex-col relative overflow-hidden border-4 border-black group",
        isFullscreen ? "h-screen border-none rounded-none mt-0" : "max-h-[500px]"
      )}
    >
      {/* Film Strip aesthetic borders (top and bottom) */}
      {!isFullscreen && (
        <>
          <div className="w-full h-4 flex justify-between px-2 py-1 gap-2 border-b border-zinc-800">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={`top-${i}`} className="w-4 h-full bg-zinc-900 rounded-[1px]" />
            ))}
          </div>
        </>
      )}

      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
            >
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        <video 
          ref={videoRef} 
          src={url} 
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onCanPlay={() => setIsLoading(false)}
          onError={() => setError(true)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* Big play button overlay when paused */}
        <AnimatePresence>
          {!isPlaying && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                <Play className="w-8 h-8 ml-1 fill-current" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer overflow-hidden"
               onClick={(e) => {
                 if (videoRef.current) {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const x = e.clientX - rect.left;
                   const percentage = x / rect.width;
                   videoRef.current.currentTime = percentage * videoRef.current.duration;
                 }
               }}
          >
            <div 
              className="h-full bg-rose-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:text-rose-400 transition-colors">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button onClick={toggleMute} className="text-white hover:text-rose-400 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
            
            <button onClick={toggleFullscreen} className="text-white hover:text-rose-400 transition-colors">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {!isFullscreen && (
        <div className="w-full h-4 flex justify-between px-2 py-1 gap-2 border-t border-zinc-800">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`bottom-${i}`} className="w-4 h-full bg-zinc-900 rounded-[1px]" />
          ))}
        </div>
      )}
    </div>
  );
}
