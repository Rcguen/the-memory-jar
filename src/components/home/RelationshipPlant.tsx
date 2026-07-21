"use client";

import { useHomeMemories } from "@/hooks/useMemoryData";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

type PlantStage = "seed" | "sprout" | "leaves" | "flower" | "smallTree" | "largeTree";

function PlantSVG({ stage }: { stage: PlantStage }) {
  // We can render tiny SVG paths for each
  switch (stage) {
    case "seed": return <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-900/50 fill-current"><path d="M12 18c-2 0-3-1-3-2 0-2 2-3 3-3s3 1 3 3c0 1-1 2-3 2z"/></svg>;
    case "sprout": return <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-600 fill-current"><path d="M12 20v-5m0 0C10 13 8 11 8 9c0 2 2 4 4 6zm0 0c2-2 4-4 4-6 0 2-2 4-4 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "leaves": return <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-500 fill-current"><path d="M12 21v-8m0 0C9 11 6 8 6 5c0 3 3 6 6 8zm0 0c3-2 6-5 6-8 0 3-3 6-6 8zm0 -2c-2-1-4-3-4-5 0 2 2 4 4 5zm0 0c2-1 4-3 4-5 0 2-2 4-4 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "flower": return <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-500"><path d="M12 22v-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="8" r="2" className="fill-rose-300"/><path d="M12 6a2 2 0 100-4 2 2 0 000 4zm2 2a2 2 0 104 0 2 2 0 00-4 0zm-2 2a2 2 0 100 4 2 2 0 000-4zm-2-2a2 2 0 10-4 0 2 2 0 004 0z" className="fill-rose-400"/></svg>;
    case "smallTree": return <svg viewBox="0 0 24 24" className="w-7 h-7 text-emerald-500 fill-current"><path d="M12 22v-10m0 0c-2-2-4-3-4-5 0 2 2 3 4 5zm0 0c2-2 4-3 4-5 0 2-2 3-4 5zm-1-3c-3-1-5-3-5-6 0 3 2 5 5 6zm2 0c3-1 5-3 5-6 0 3-2 5-5 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4"/></svg>;
    case "largeTree": return <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-600 fill-current"><path d="M12 22v-12m0 0c-3-3-6-4-6-7 0 3 3 4 6 7zm0 0c3-3 6-4 6-7 0 3-3 4-6 7zm-2-4c-4-2-7-5-7-9 0 4 3 7 7 9zm4 0c4-2 7-5 7-9 0 4-3 7-7 9z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="5" r="5"/><circle cx="8" cy="7" r="4"/><circle cx="16" cy="7" r="4"/></svg>;
  }
}

export function RelationshipPlant() {
  const { totalCount } = useHomeMemories();

  const stage = useMemo(() => {
    const count = totalCount;
    if (count >= 300) return "largeTree";
    if (count >= 100) return "smallTree";
    if (count >= 50) return "flower";
    if (count >= 25) return "leaves";
    if (count >= 5) return "sprout";
    return "seed";
  }, [totalCount]);

  return (
    <div className="mt-2 flex min-w-0 items-center gap-2 pb-4 text-zinc-500 opacity-60 transition-opacity hover:opacity-100 xl:justify-self-end">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="origin-bottom"
        >
          <PlantSVG stage={stage} />
        </motion.div>
      </AnimatePresence>
      <span className="min-w-0 text-[10px] font-cormorant uppercase leading-snug tracking-widest">Growing together</span>
    </div>
  );
}
