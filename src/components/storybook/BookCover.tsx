import React from "react";
import { motion } from "framer-motion";

interface BookCoverProps {
  title: string;
  subtitle: string;
  dateStr?: string;
  onClick?: () => void;
}

export function BookCover({ title, subtitle, dateStr, onClick }: BookCoverProps) {
  const depth = 40; // 40px thick book
  const halfDepth = depth / 2;

  // Reusable texture
  const leatherTexture = (
    <div 
      className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }}
    />
  );

  return (
    <motion.div
      onClick={onClick}
      className="w-full h-full min-h-[400px] cursor-pointer relative"
      initial={{ rotateY: -10, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: 90, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{ transformStyle: "preserve-3d" }}
      role="button"
      tabIndex={0}
      aria-label={`Open Book: ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Front Cover */}
      <div 
        className="absolute inset-0 bg-amber-900 flex flex-col items-center justify-center p-8 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)] overflow-hidden rounded-r-xl"
        style={{ transform: `translateZ(${halfDepth}px)`, backfaceVisibility: 'hidden' }}
      >
        {leatherTexture}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/20" /> {/* Spine shadow */}
        <div className="absolute inset-4 border-2 border-amber-400/40 rounded-sm pointer-events-none" />
        <div className="absolute inset-6 border border-amber-400/20 rounded-sm pointer-events-none" />

        <motion.div 
          className="z-10 flex flex-col items-center text-center space-y-6 relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-serif text-amber-100 drop-shadow-md tracking-wider">
            {title}
          </h1>
          <div className="w-16 h-px bg-amber-400/50" />
          <h2 className="text-xl md:text-2xl font-serif italic text-amber-200/90">
            {subtitle}
          </h2>
          {dateStr && (
            <p className="text-sm font-medium tracking-widest text-amber-200/60 uppercase mt-8">
              {dateStr}
            </p>
          )}
        </motion.div>
      </div>

      {/* Back Cover */}
      <div 
        className="absolute inset-0 bg-amber-950 rounded-l-xl"
        style={{ transform: `rotateY(180deg) translateZ(${halfDepth}px)` }}
      >
        {leatherTexture}
      </div>

      {/* Spine (Left) */}
      <div 
        className="absolute top-0 bottom-0 bg-amber-950 flex items-center justify-center overflow-hidden"
        style={{ 
          width: `${depth}px`, 
          left: `-${halfDepth}px`, 
          transform: `rotateY(-90deg)`
        }}
      >
        {leatherTexture}
        <div className="absolute inset-x-0 top-8 bottom-8 border-y-4 border-black/30" />
      </div>

      {/* Paper Edge (Right) */}
      <div 
        className="absolute bg-[#e6d5b8] overflow-hidden"
        style={{ 
          top: '4px', bottom: '4px',
          width: `${depth - 4}px`, 
          right: `-${halfDepth - 2}px`, 
          transform: `rotateY(90deg) translateZ(-4px)`
        }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />
      </div>

      {/* Paper Edge (Top) */}
      <div 
        className="absolute bg-[#ebdcb5] overflow-hidden"
        style={{ 
          left: '2px', right: '4px',
          height: `${depth - 4}px`, 
          top: `-${halfDepth - 2}px`, 
          transform: `rotateX(90deg) translateZ(-4px)`
        }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />
      </div>

      {/* Paper Edge (Bottom) */}
      <div 
        className="absolute bg-[#dbccaa] overflow-hidden"
        style={{ 
          left: '2px', right: '4px',
          height: `${depth - 4}px`, 
          bottom: `-${halfDepth - 2}px`, 
          transform: `rotateX(-90deg) translateZ(-4px)`
        }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />
      </div>
    </motion.div>
  );
}
