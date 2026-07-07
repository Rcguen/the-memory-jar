import React from "react";

import { BookPageData } from "@/types/storybook";
import { PhotoGallery } from "@/components/viewer/PhotoGallery";
import { AudioPlayer } from "@/components/viewer/AudioPlayer";
import { VideoPlayer } from "@/components/viewer/VideoPlayer";

interface BookPageProps {
  pageData: BookPageData;
  isLeftPage: boolean;
}

export function BookPage({ pageData, isLeftPage }: BookPageProps) {
  const { memory, layout } = pageData;
  const attachments = memory.attachments || [];
  
  // Render based on layout
  const renderContent = () => {
    switch (layout) {
      case "full_photo":
      case "photo_with_caption": {
        const photos = attachments.filter(a => a.file_type === "photo");
        if (photos.length === 0) return null;
        
        return (
          <div className="flex flex-col h-full">
            <div className={`flex-1 relative ${layout === "full_photo" ? "-mx-8 -mt-8" : ""}`}>
              {layout === "full_photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={photos[0].url} 
                  alt={memory.title || "Memory Photo"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden border-4 border-white shadow-md bg-zinc-100 relative mt-4">
                  <PhotoGallery attachments={photos} />
                </div>
              )}
            </div>
            
            {layout === "photo_with_caption" && memory.content && (
              <div className="mt-8 font-serif text-zinc-800 text-lg leading-relaxed px-4">
                {memory.content}
              </div>
            )}
            
            {layout === "full_photo" && memory.title && (
              <div className="absolute bottom-8 left-8 right-8 p-4 bg-black/50 backdrop-blur-md rounded-lg text-white">
                <h3 className="font-serif text-xl">{memory.title}</h3>
                {memory.content && <p className="text-sm mt-2 opacity-90">{memory.content}</p>}
              </div>
            )}
          </div>
        );
      }
        
      case "video": {
        const videos = attachments.filter(a => a.file_type === "video");
        if (videos.length === 0) return null;
        
        return (
          <div className="flex flex-col h-full p-4">
            <div className="w-full rounded-lg overflow-hidden shadow-md bg-zinc-900 aspect-video">
              <VideoPlayer url={videos[0].url} />
            </div>
            {memory.content && (
              <div className="mt-8 font-serif text-zinc-800 text-lg leading-relaxed">
                {memory.content}
              </div>
            )}
          </div>
        );
      }
        
      case "voice": {
        const voices = attachments.filter(a => a.file_type === "voice");
        if (voices.length === 0) return null;
        
        return (
          <div className="flex flex-col h-full justify-center p-8">
            <div className="bg-amber-50/80 rounded-2xl p-6 shadow-sm border border-amber-200/50">
              <h3 className="font-serif text-xl text-amber-900 mb-6 text-center">
                {memory.title || "Voice Note"}
              </h3>
              <AudioPlayer url={voices[0].url} />
              
              {memory.content && (
                <div className="mt-6 font-serif text-amber-800/80 text-center italic">
                  &quot;{memory.content}&quot;
                </div>
              )}
            </div>
          </div>
        );
      }
        
      case "letter":
      case "text_only": {
        // Styled paper for text
        return (
          <div className="flex flex-col h-full p-4 md:p-8">
            <div className="flex-1 bg-[#fdfaf6] rounded-sm shadow-sm border border-zinc-200 p-8 relative overflow-hidden flex flex-col">
              {/* Lines background for letter */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #000 31px, #000 32px)",
                  backgroundPosition: "0 40px"
                }}
              />
              
              <h3 className="font-serif text-2xl text-zinc-800 mb-6 relative z-10">
                {memory.title}
              </h3>
              
              <div className="flex-1 font-serif text-zinc-700 leading-8 relative z-10 whitespace-pre-wrap">
                {memory.content}
              </div>
              
              <div className="mt-8 text-right font-serif text-zinc-500 italic relative z-10">
                — {memory.creator?.display_name || "Unknown"}
              </div>
            </div>
          </div>
        );
      }
        
      case "capsule": {
        return (
          <div className="flex flex-col h-full items-center justify-center p-8">
            <div className="w-48 h-48 rounded-full border-4 border-amber-200 flex items-center justify-center bg-amber-50 mb-8 shadow-inner">
              <span className="text-6xl">⏳</span>
            </div>
            <h3 className="font-serif text-2xl text-amber-900 mb-4 text-center">
              {memory.title || "Time Capsule"}
            </h3>
            <p className="font-serif text-amber-800/80 text-center">
              Opened on {new Date(memory.unlocked_at || memory.memory_date).toLocaleDateString()}
            </p>
            {memory.content && (
              <div className="mt-8 font-serif text-zinc-800 text-lg leading-relaxed text-center px-4">
                {memory.content}
              </div>
            )}
          </div>
        );
      }
        
      default:
        return null;
    }
  };

  return (
    <div 
      className={`absolute inset-0 w-full h-full bg-[#f4ebd8] [backface-visibility:hidden] flex flex-col`}
      style={{
        boxShadow: isLeftPage 
          ? "inset -10px 0 20px -10px rgba(0,0,0,0.1)" 
          : "inset 10px 0 20px -10px rgba(0,0,0,0.1)"
      }}
    >
      {/* Paper texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Date header */}
      <div className={`p-6 pb-2 text-sm font-serif tracking-widest text-zinc-400 uppercase ${isLeftPage ? "text-left" : "text-right"}`}>
        {new Date(memory.memory_date).toLocaleDateString(undefined, { 
          month: 'long', day: 'numeric', year: 'numeric' 
        })}
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10 scrollbar-hide">
        {renderContent()}
      </div>
      
      {/* Page number */}
      <div className={`p-4 text-xs font-serif text-zinc-400 ${isLeftPage ? "text-left" : "text-right"}`}>
        {pageData.pageNumber}
      </div>
    </div>
  );
}
