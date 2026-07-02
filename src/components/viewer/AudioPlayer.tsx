import { useState, useRef } from "react";
import { Play, Pause, FastForward, Rewind } from "lucide-react";
import { motion } from "framer-motion";

interface AudioPlayerProps {
  url: string;
}

export function AudioPlayer({ url }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
    }
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
          animate={{ rotate: isPlaying ? 360 : 0 }} 
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-zinc-700 flex items-center justify-center bg-zinc-800"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700" />
        </motion.div>
        <motion.div 
          animate={{ rotate: isPlaying ? 360 : 0 }} 
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-zinc-700 flex items-center justify-center bg-zinc-800"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700" />
        </motion.div>
      </div>

      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Controls */}
      <div className="flex items-center justify-between mt-2 z-10">
        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Rewind className="w-5 h-5 fill-current" />
        </button>
        
        <button 
          onClick={togglePlay}
          className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-transform active:scale-95"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
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
    </div>
  );
}
