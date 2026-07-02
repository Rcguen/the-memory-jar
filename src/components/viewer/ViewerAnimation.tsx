import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MemoryType, Memory } from "@/types/memory";

// Physical Objects
import { Polaroid } from "../jar/objects/Polaroid";
import { Cassette } from "../jar/objects/Cassette";
import { Letter } from "../jar/objects/Letter";
import { WaxSealDoc } from "../jar/objects/WaxSealDoc";
import { OrigamiStar } from "../jar/objects/OrigamiStar";
import { Postcard } from "../jar/objects/Postcard";
import { GlowingNote } from "../jar/objects/GlowingNote";
import { TinySlip } from "../jar/objects/TinySlip";

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

// Content Components (We will create these next)
import { ViewerContent } from "./ViewerContent";
import { MEMORY_THEMES } from "@/lib/memoryThemes";

interface ViewerAnimationProps {
  memoryId: string;
  type: MemoryType;
  fullMemory: Memory;
  onClose: () => void;
  stage: "opening" | "viewing";
}

export function ViewerAnimation({ memoryId, type, fullMemory, onClose, stage: initialStage }: ViewerAnimationProps) {
  // We keep a local stage to progress from opening -> viewing
  const [stage, setStage] = useState<"floating" | "unveiling" | "reading">(
    initialStage === "viewing" ? "reading" : "floating"
  );

  useEffect(() => {
    if (initialStage === "viewing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("reading");
      return;
    }

    // Stage 1: Float up and stabilize
    const floatTimer = setTimeout(() => {
      setStage("unveiling");
    }, 300);

    // Stage 2: Play the cinematic opening animation, then transition to reading
    const unveilTimer = setTimeout(() => {
      setStage("reading");
    }, 900); // 300ms float + 600ms unveil

    return () => {
      clearTimeout(floatTimer);
      clearTimeout(unveilTimer);
    };
  }, [memoryId, initialStage]); // Reset if memory ID changes (e.g. Next/Prev sliding)

  const renderPhysicalObject = () => {
    // Render the physical SVG object based on memory type.
    // In "unveiling" stage, we apply specific micro-animations.
    const isUnveiling = stage === "unveiling";

    const commonProps = {
      // In viewer, we want them significantly larger than in the jar
      style: { width: "250px", height: "auto" },
      velocityY: 0,
      isSleeping: true
    };

    switch (type) {
      case "photo":
        return (
          <motion.div
            animate={isUnveiling ? { rotateY: 180, scale: 1.2 } : { rotateY: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Polaroid {...commonProps} />
          </motion.div>
        );
      case "voice":
        return (
          <motion.div
            animate={isUnveiling ? { rotateX: -20, scale: 1.1 } : { rotateX: 0, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Cassette {...commonProps} />
          </motion.div>
        );
      case "letter":
        return (
          <motion.div
            animate={isUnveiling ? { scaleY: [1, 0.9, 1.2], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.8 }}
          >
            <Letter {...commonProps} />
          </motion.div>
        );
      case "promise":
        return (
          <motion.div
            animate={isUnveiling ? { scale: 1.1, filter: "brightness(1.2)" } : {}}
            transition={{ duration: 0.8 }}
          >
            <WaxSealDoc {...commonProps} />
          </motion.div>
        );
      case "video":
        return <Cassette {...commonProps} />;
      case "wish":
        return (
          <motion.div
            animate={isUnveiling ? { rotate: 180, scale: 1.5, opacity: 0.8 } : {}}
            transition={{ duration: 1 }}
          >
            <OrigamiStar {...commonProps} />
          </motion.div>
        );
      case "travel":
        return (
          <motion.div
            animate={isUnveiling ? { rotateY: -180, scale: 1.2 } : {}}
            transition={{ duration: 0.8 }}
          >
            <Postcard {...commonProps} />
          </motion.div>
        );
      case "gratitude":
        return (
          <motion.div
            animate={isUnveiling ? { scale: 1.5, filter: "brightness(1.5) blur(2px)" } : {}}
            transition={{ duration: 0.8 }}
          >
            <GlowingNote {...commonProps} />
          </motion.div>
        );
      default:
        return <TinySlip {...commonProps} />;
    }
  };

  const themeName = fullMemory.theme || 'modern';
  const themeConfig = MEMORY_THEMES[themeName] || MEMORY_THEMES.modern;
  const animationPreset = themeConfig.animationPreset;

  const getReadingVariants = () => {
    switch (animationPreset) {
      case "vintage":
        return {
          initial: { opacity: 0, rotateX: 90, y: 20 },
          animate: { opacity: 1, rotateX: 0, y: 0 },
          exit: { opacity: 0, rotateX: 90, y: 20 }
        };
      case "romantic":
        return {
          initial: { opacity: 0, filter: "blur(20px)", scale: 1.1 },
          animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
          exit: { opacity: 0, filter: "blur(10px)", scale: 1.05 }
        };
      case "dream":
        return {
          initial: { opacity: 0, y: -50, filter: "blur(10px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          exit: { opacity: 0, y: -50, filter: "blur(10px)" }
        };
      case "nature":
        return {
          initial: { opacity: 0, rotateZ: 5, y: 30 },
          animate: { opacity: 1, rotateZ: 0, y: 0 },
          exit: { opacity: 0, rotateZ: -5, y: 30 }
        };
      case "dark":
        return {
          initial: { opacity: 0, scale: 0.9, filter: "brightness(0.5)" },
          animate: { opacity: 1, scale: 1, filter: "brightness(1)" },
          exit: { opacity: 0, scale: 0.9, filter: "brightness(0.5)" }
        };
      case "modern":
        return {
          initial: { opacity: 0, scale: 0.95, y: 20 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.9, y: 20 }
        };
      default:
        assertNever(animationPreset);
    }
  };

  const readingVariants = getReadingVariants();

  return (
    <div className="relative w-[90vw] max-w-4xl min-h-[60vh] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {stage !== "reading" ? (
          <motion.div
            key="physical-object"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute z-20 flex items-center justify-center flex-col gap-6"
          >
            {renderPhysicalObject()}
            
            <AnimatePresence>
              {stage === "unveiling" && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-cormorant text-2xl text-emerald-100 italic tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  Unveiling memory...
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="reading-pane"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={readingVariants}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="w-full h-full relative z-30 perspective-1000"
          >
            {/* The actual reading experience */}
            <ViewerContent memoryId={memoryId} type={type} fullMemory={fullMemory} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
