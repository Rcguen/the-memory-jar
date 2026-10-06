import { motion, AnimatePresence } from "framer-motion";
import { MemoryType, Memory } from "@/types/memory";
import { ViewerContent } from "./ViewerContent";
import { MEMORY_THEMES } from "@/lib/memoryThemes";

interface ViewerAnimationProps {
  memoryId: string;
  type: MemoryType;
  fullMemory: Memory;
  onClose: () => void;
  stage: "opening" | "viewing";
}

export function ViewerAnimation({ memoryId, type, fullMemory, onClose }: ViewerAnimationProps) {
  const themeName = fullMemory.theme || 'modern';
  const themeConfig = MEMORY_THEMES[themeName] || MEMORY_THEMES.modern;
  const animationPreset = themeConfig.animationPreset;

  const getReadingVariants = () => {
    switch (animationPreset) {
      case "vintage":
        return { initial: { opacity: 0, rotateX: 20, y: 10 }, animate: { opacity: 1, rotateX: 0, y: 0 } };
      case "romantic":
        return { initial: { opacity: 0, scale: 1.05 }, animate: { opacity: 1, scale: 1 } };
      case "dream":
        return { initial: { opacity: 0, y: -20, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 } };
      case "nature":
        return { initial: { opacity: 0, rotateZ: 2, y: 15 }, animate: { opacity: 1, rotateZ: 0, y: 0 } };
      default:
        return { initial: { opacity: 0, scale: 0.98, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 } };
    }
  };

  return (
    <div className="relative flex min-h-[60vh] w-full max-w-[70rem] items-center justify-center px-0 sm:px-3">
      <motion.div
        key={`content-${memoryId}`}
        initial="initial"
        animate="animate"
        exit="initial"
        variants={getReadingVariants()}
        transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
        className="w-full flex justify-center"
      >
        <ViewerContent memoryId={memoryId} type={type} fullMemory={fullMemory} onClose={onClose} />
      </motion.div>
    </div>
  );
}
