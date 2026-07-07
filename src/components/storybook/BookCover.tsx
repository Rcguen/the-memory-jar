import React from "react";
import { motion } from "framer-motion";

interface BookCoverProps {
  title: string;
  subtitle: string;
  dateStr?: string;
  onClick?: () => void;
}

export function BookCover({ title, subtitle, dateStr, onClick }: BookCoverProps) {
  return (
    <motion.div
      onClick={onClick}
      className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 cursor-pointer rounded-r-2xl shadow-2xl relative overflow-hidden bg-amber-900 border-l-[16px] border-amber-950"
      initial={{ rotateY: -10, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: 90, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
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
      {/* Leather texture overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Gold foil border */}
      <div className="absolute inset-4 border-2 border-amber-400/40 rounded-sm pointer-events-none" />
      <div className="absolute inset-6 border border-amber-400/20 rounded-sm pointer-events-none" />

      <motion.div 
        className="z-10 flex flex-col items-center text-center space-y-6"
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
    </motion.div>
  );
}
