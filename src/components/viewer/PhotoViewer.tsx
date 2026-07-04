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
          initial={{ opacity: 0, y: 14, scale: 0.98, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.018, filter: "brightness(1.04)" }}
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
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
              initial={{ opacity: 0, scale: 0.88, y: 28, rotateZ: -2, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateZ: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.82, y: 34, rotateZ: 3, filter: "blur(10px)" }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              src={url}
              alt="Memory attachment fullscreen"
              className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
              drag
              dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
              dragElastic={0.1}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
              whileTap={{ scale: 1.04 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
