"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useYearRecapStats } from "@/hooks/useStorybookData";
import { YearRecapStats } from "@/types/storybook";
import { EmojiText } from "@/components/ui/EmojiText";
import { memoryService } from "@/services/memory";
import type { MemoryAttachment } from "@/types/memory";


export function YearRecapClient() {
  const { data: relationship } = useRelationshipContext();
  const currentYear = new Date().getFullYear();
  const startYear = relationship?.startDate ? new Date(relationship.startDate).getFullYear() : currentYear;
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const { data: stats, isLoading } = useYearRecapStats(selectedYear);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear, startYear]);

  return (
    <div className="relative min-h-screen text-amber-50 overflow-hidden pt-12 md:pt-24 pb-32">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/40 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 pointer-events-none mix-blend-overlay" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        
        {/* Header & Year Selector */}
        <header className="flex flex-col items-center mb-16 space-y-8">
          <h1 className="text-4xl md:text-6xl font-serif text-amber-200/90 tracking-wider">
            Our Story in {selectedYear}
          </h1>
          
          <div className="flex gap-4 overflow-x-auto max-w-full pb-4 scrollbar-hide px-4">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-6 py-2 rounded-full font-serif text-lg transition-all duration-300 ${
                  selectedYear === year 
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/10"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-20"
            >
              <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            </motion.div>
          ) : stats ? (
            <motion.div 
              key={`stats-${selectedYear}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, staggerChildren: 0.2 }}
              className="space-y-24"
            >
              {stats.totalMemories === 0 ? (
                <div className="text-center py-20 space-y-6">
                  <div className="text-6xl opacity-50">✨</div>
                  <h2 className="text-2xl font-serif text-amber-200/60">
                    The pages for {selectedYear} are still blank.
                  </h2>
                  <p className="text-white/40 max-w-md mx-auto">
                    There are no memories recorded for this year. Perhaps it was before you met, or you just haven&apos;t added anything yet.
                  </p>
                </div>
              ) : (
                <StoryBlocks stats={stats} />
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="no-relationship"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-32 space-y-6 text-center"
            >
              <div className="text-6xl mb-4">🌱</div>
              <h2 className="text-3xl font-serif text-amber-200/80">
                No relationship found.
              </h2>
              <p className="text-white/50 max-w-md mx-auto">
                Once you start a relationship and add memories to your jar, your Year Recap will appear here.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function StoryBlocks({ stats }: { stats: YearRecapStats }) {
  const { 
    year, daysTogether, totalMemories, totalPhotos, totalVideos, totalVoices, totalLetters, 
    openedCapsules, totalFavorites, longestStreak, mostCommonMood, favoriteReaction, 
    firstMemory, lastMemory 
  } = stats;

  return (
    <div className="flex flex-col gap-32">
      {/* Intro */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="text-center max-w-2xl mx-auto space-y-6"
      >
        <p className="text-2xl md:text-4xl font-serif leading-relaxed text-amber-100/90">
          {year} was a beautiful chapter.
        </p>
        {daysTogether > 0 && (
          <p className="text-lg md:text-xl text-white/60 font-serif italic">
            You spent {daysTogether} days together, building a lifetime of memories.
          </p>
        )}
      </motion.section>

      {/* Highlights */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-5xl font-serif text-amber-400 mb-4">{totalMemories}</h3>
          <p className="text-xl text-white/80 font-serif">Moments Captured</p>
          <p className="text-sm text-white/40 mt-4">
            That&apos;s {totalPhotos} photos, {totalVideos} videos, and {totalVoices} voice notes preserved forever.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-5xl font-serif text-rose-400 mb-4">{totalLetters}</h3>
          <p className="text-xl text-white/80 font-serif">Letters Written</p>
          <p className="text-sm text-white/40 mt-4">
            Words of love, promises, and wishes documented across the year.
          </p>
        </div>
      </motion.section>

      {/* The Journey */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="relative"
      >
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
        
        <div className="space-y-24">
          {firstMemory && (
            <div className="flex flex-col md:flex-row items-center gap-8 relative">
              <div className="hidden md:flex flex-1 justify-end">
                <div className="text-right">
                  <h4 className="font-serif text-xl text-amber-200">Where it started</h4>
                  <p className="text-white/40 text-sm mt-1">
                    {new Date(firstMemory.memory_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-amber-500/50 flex items-center justify-center z-10 shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="flex-1 w-full md:w-auto">
                <div className="md:hidden mb-4">
                  <h4 className="font-serif text-xl text-amber-200">Where it started</h4>
                  <p className="text-white/40 text-sm mt-1">
                    {new Date(firstMemory.memory_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  {firstMemory.attachments && firstMemory.attachments.length > 0 && firstMemory.attachments[0].file_type === 'photo' ? (
                    <RecapMemoryImage attachment={firstMemory.attachments[0]} />
                  ) : null}
                  <h5 className="font-serif text-lg text-white/90">{firstMemory.title || "First memory of the year"}</h5>
                  {firstMemory.content && <p className="text-white/60 mt-2 line-clamp-3">{firstMemory.content}</p>}
                </div>
              </div>
            </div>
          )}

          {longestStreak > 2 && (
            <div className="flex flex-col md:flex-row items-center gap-8 relative">
              <div className="flex-1 order-2 md:order-1 md:text-right w-full md:w-auto">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm inline-block w-full md:w-auto text-center md:text-right">
                  <h4 className="text-4xl font-serif text-amber-400">{longestStreak} Days</h4>
                  <p className="text-white/60 font-serif mt-2">Your longest unbroken streak of memories.</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-amber-500/50 flex items-center justify-center z-10 shrink-0 order-1 md:order-2">
                <span className="text-xs">🔥</span>
              </div>
              <div className="hidden md:block flex-1 order-3" />
            </div>
          )}

          {lastMemory && (
            <div className="flex flex-col md:flex-row items-center gap-8 relative">
              <div className="hidden md:flex flex-1 justify-end">
                <div className="text-right">
                  <h4 className="font-serif text-xl text-amber-200">How it ended</h4>
                  <p className="text-white/40 text-sm mt-1">
                    {new Date(lastMemory.memory_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-amber-500/50 flex items-center justify-center z-10 shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="flex-1 w-full md:w-auto">
                <div className="md:hidden mb-4">
                  <h4 className="font-serif text-xl text-amber-200">How it ended</h4>
                  <p className="text-white/40 text-sm mt-1">
                    {new Date(lastMemory.memory_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <h5 className="font-serif text-lg text-white/90">{lastMemory.title || "Last memory of the year"}</h5>
                  {lastMemory.content && <p className="text-white/60 mt-2 line-clamp-3">{lastMemory.content}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* Summary Stats */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="flex flex-wrap justify-center gap-4 text-center max-w-3xl mx-auto"
      >
        {openedCapsules > 0 && (
          <div className="px-6 py-4 bg-white/5 rounded-full border border-white/10">
            <span className="text-amber-400 font-serif">{openedCapsules}</span>
            <span className="text-white/60 ml-2">Capsules Opened</span>
          </div>
        )}
        {totalFavorites > 0 && (
          <div className="px-6 py-4 bg-white/5 rounded-full border border-white/10">
            <span className="text-rose-400 font-serif">{totalFavorites}</span>
            <span className="text-white/60 ml-2">Favorites</span>
          </div>
        )}
        {mostCommonMood && (
          <div className="px-6 py-4 bg-white/5 rounded-full border border-white/10">
            <span className="mr-2"><EmojiText text={mostCommonMood.emoji} /></span>
            <span className="text-white/60">Most felt </span>
            <span className="text-white/90 font-serif capitalize">{mostCommonMood.name}</span>
          </div>
        )}
        {favoriteReaction && (
          <div className="px-6 py-4 bg-white/5 rounded-full border border-white/10">
            <span className="mr-2"><EmojiText text={favoriteReaction} /></span>
            <span className="text-white/60">Most used reaction</span>
          </div>
        )}
      </motion.section>
    </div>
  );
}

function RecapMemoryImage({ attachment }: { attachment: MemoryAttachment }) {
  const { data: url } = useQuery({
    queryKey: ["signedAttachmentUrl", attachment.id, attachment.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(attachment.file_type, attachment.url),
    staleTime: 1000 * 60 * 30,
  });

  if (!url) {
    return <div className="mb-4 aspect-video w-full animate-pulse rounded-lg bg-white/10" />;
  }

  return (
    <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
    </div>
  );
}