import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";

interface PhotoViewerProps {
  url: string;
}

export function PhotoViewer({ url }: PhotoViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      {/* Inline Viewer */}
      <div className="relative group overflow-hidden rounded-xl border border-black/10 dark:border-white/10 mt-6">
        <motion.img 
          src={url} 
          alt="Memory attachment" 
          className="w-full h-auto object-cover max-h-[400px] cursor-pointer"
          whileHover={{ scale: 1.02 }}
          onClick={() => setIsFullscreen(true)}
        />
        <button 
          onClick={() => setIsFullscreen(true)}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors backdrop-blur-md z-[210]"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            
            <motion.img
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              src={url}
              alt="Memory attachment fullscreen"
              className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
              drag
              dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
              dragElastic={0.1}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
              whileTap={{ scale: 1.1 }} // Simple pinch-zoom simulation for desktop
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
