import React from "react";
import { motion } from "framer-motion";

interface BookCoverProps {
  title: string;
  subtitle: string;
  dateStr?: string;
  reduceMotion?: boolean;
  onClick?: () => void;
}

export function BookCover({ title, subtitle, dateStr, reduceMotion = false, onClick }: BookCoverProps) {
  const depth = 36;
  const halfDepth = depth / 2;

  // Reusable subtle paper/leather noise texture
  const leatherTexture = (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none mix-blend-multiply"
      style={{
        opacity: 0.14,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }}
    />
  );

  return (
    <motion.div
      className="w-full h-full min-h-[400px] relative"
      initial={reduceMotion ? { opacity: 0 } : { rotateY: -8, opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
      exit={reduceMotion
        ? { opacity: 0, transition: { duration: 0.2 } }
        : { rotateY: 90, opacity: 0, transition: { duration: 0.5, ease: [0.32, 0, 0.67, 0] } }
      }
      transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Front Cover */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-r-xl"
        style={{
          transform: `translateZ(${halfDepth}px)`,
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(160deg, #7c4a1e 0%, #5c3010 50%, #4a2208 100%)',
          boxShadow: 'inset -8px 0 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,220,160,0.12)',
        }}
      >
        {leatherTexture}

        {/* Spine shadow strip */}
        <div aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-3 bg-black/25" />

        {/* Inset frame — restrained single border */}
        <div aria-hidden="true" className="absolute inset-5 rounded-[2px] border border-[rgba(255,195,110,0.28)] pointer-events-none" />

        <motion.div
          className="z-10 flex flex-col items-center text-center px-10 relative"
          initial={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.3, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        >
          <p aria-hidden="true" className="mb-5 text-[10px] font-medium tracking-[0.3em] text-amber-300/50 uppercase">
            A Love Story
          </p>

          <h1 className="font-cormorant text-[2.6rem] leading-tight text-amber-50 tracking-wide sm:text-[3rem]">
            {title}
          </h1>

          <div aria-hidden="true" className="my-5 h-px w-12 bg-amber-400/35" />

          <h2 className="font-cormorant text-lg italic text-amber-200/75">
            {subtitle}
          </h2>

          {dateStr && (
            <p className="mt-8 text-[10px] font-medium tracking-[0.28em] text-amber-300/40 uppercase">
              {dateStr}
            </p>
          )}

          {/* Open affordance */}
          <button
            type="button"
            onClick={onClick}
            aria-label={`Open storybook: ${title}`}
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-50/5 px-5 py-2 text-[11px] tracking-widest text-amber-200/60 uppercase transition-colors hover:border-amber-300/35 hover:bg-amber-50/10 hover:text-amber-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 active:scale-[0.97]"
          >
            Open
          </button>
        </motion.div>
      </div>

      {/* Back Cover */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-l-xl"
        style={{
          transform: `rotateY(180deg) translateZ(${halfDepth}px)`,
          background: 'linear-gradient(160deg, #4a2208 0%, #3b1a05 100%)',
        }}
      >
        {leatherTexture}
      </div>

      {/* Spine (Left) */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 flex items-center justify-center overflow-hidden"
        style={{
          width: `${depth}px`,
          left: `-${halfDepth}px`,
          transform: `rotateY(-90deg)`,
          background: '#3b1a05',
        }}
      >
        {leatherTexture}
      </div>

      {/* Paper Edge (Right) */}
      <div
        aria-hidden="true"
        className="absolute overflow-hidden"
        style={{
          top: '3px', bottom: '3px',
          width: `${depth - 4}px`,
          right: `-${halfDepth - 2}px`,
          transform: `rotateY(90deg) translateZ(-4px)`,
          background: '#e8d8b8',
        }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.04)_2px,rgba(0,0,0,0.04)_4px)]" />
      </div>

      {/* Paper Edge (Top) */}
      <div
        aria-hidden="true"
        className="absolute overflow-hidden"
        style={{
          left: '2px', right: '4px',
          height: `${depth - 4}px`,
          top: `-${halfDepth - 2}px`,
          transform: `rotateX(90deg) translateZ(-4px)`,
          background: '#eddfc0',
        }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.04)_2px,rgba(0,0,0,0.04)_4px)]" />
      </div>

      {/* Paper Edge (Bottom) */}
      <div
        aria-hidden="true"
        className="absolute overflow-hidden"
        style={{
          left: '2px', right: '4px',
          height: `${depth - 4}px`,
          bottom: `-${halfDepth - 2}px`,
          transform: `rotateX(-90deg) translateZ(-4px)`,
          background: '#dece9e',
        }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.04)_2px,rgba(0,0,0,0.04)_4px)]" />
      </div>
    </motion.div>
  );
}
