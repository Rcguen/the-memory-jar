import React from "react";
import { motion } from "framer-motion";
import { MemoryHighlights } from "@/types/storybook";
import { Memory } from "@/types/memory";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";

interface HighlightsGalleryProps {
  highlights: MemoryHighlights;
}

export function HighlightsGallery({ highlights }: HighlightsGalleryProps) {
  const { openViewer } = useMemoryViewer();

  const sections = [
    { title: "Most Loved", description: "The memories that captured your hearts.", data: highlights.mostLoved, emoji: "❤️" },
    { title: "Most Discussed", description: "The moments you couldn't stop talking about.", data: highlights.mostCommented, emoji: "💬" },
    { title: "Hidden Gems", description: "Old favorites worth revisiting.", data: highlights.hiddenGems, emoji: "💎" },
    { title: "Waiting to be Unlocked", description: "Time capsules from the past.", data: highlights.waitingCapsules, emoji: "⏳" },
  ];

  return (
    <div className="space-y-16">
      {sections.map(section => {
        if (!section.data || section.data.length === 0) return null;
        
        return (
          <section key={section.title} className="space-y-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-serif text-amber-200/90 flex items-center gap-3">
                <span className="text-3xl">{section.emoji}</span>
                {section.title}
              </h3>
              <p className="text-white/50 text-sm mt-1">{section.description}</p>
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
              {section.data.map((memory: Memory) => (
                <motion.div
                  key={memory.id}
                  whileHover={{ y: -4 }}
                  onClick={() => openViewer(memory.id)}
                  className="w-48 h-64 shrink-0 rounded-xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer relative group"
                >
                  {memory.attachments && memory.attachments.length > 0 && memory.attachments[0].file_type === 'photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={memory.attachments[0].url} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-rose-500/10 flex items-center justify-center p-4">
                      <p className="text-white/80 font-serif text-center line-clamp-4">{memory.content || memory.title}</p>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-xs text-white/60 mb-1">{new Date(memory.memory_date).toLocaleDateString()}</p>
                    <p className="text-sm text-white/90 font-serif font-medium truncate">{memory.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
