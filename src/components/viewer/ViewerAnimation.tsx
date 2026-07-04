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

function getTypeReadingVariants(type: MemoryType) {
  switch (type) {
    case "letter":
    case "promise":
      return {
        initial: { opacity: 0, y: 34, rotateX: -58, scale: 0.92, filter: "blur(8px)" },
        animate: { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: 42, rotateX: 64, rotateZ: -3, scale: 0.82, filter: "blur(10px)" },
      };
    case "photo":
      return {
        initial: { opacity: 0, y: 28, rotateZ: -4, scale: 0.88, filter: "blur(6px) saturate(0.75)" },
        animate: { opacity: 1, y: 0, rotateZ: 0, scale: 1, filter: "blur(0px) saturate(1)" },
        exit: { opacity: 0, y: 30, rotateZ: 6, scale: 0.78, filter: "blur(8px) saturate(0.65)" },
      };
    case "random_thought":
    case "wish":
    case "gratitude":
      return {
        initial: { opacity: 0, y: -24, scale: 0.9, filter: "blur(14px) brightness(1.25)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px) brightness(1)" },
        exit: { opacity: 0, y: -30, rotateZ: 10, scale: 0.72, filter: "blur(18px) brightness(1.3)" },
      };
    case "voice":
    case "video":
      return {
        initial: { opacity: 0, y: 22, rotateX: 18, scale: 0.9, filter: "blur(7px)" },
        animate: { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: 34, rotateX: -28, scale: 0.8, filter: "blur(10px)" },
      };
    case "travel":
      return {
        initial: { opacity: 0, x: 38, y: 18, rotateZ: 5, scale: 0.9, filter: "blur(6px)" },
        animate: { opacity: 1, x: 0, y: 0, rotateZ: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, x: -48, y: 22, rotateZ: -7, scale: 0.78, filter: "blur(8px)" },
      };
    default:
      return {
        initial: { opacity: 0, scale: 0.92, y: 20, filter: "blur(7px)" },
        animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.8, y: 28, filter: "blur(10px)" },
      };
  }
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
            animate={isUnveiling ? { rotateY: [0, 14, 0], rotateZ: [-2, 3, 0], scale: [1, 1.12, 1.04] } : { rotateY: 0, rotateZ: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
            animate={isUnveiling ? { rotateX: [0, -34, 0], scaleY: [1, 0.82, 1.12], opacity: [1, 0.86, 1] } : { rotateX: 0, scaleY: 1 }}
            transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}
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
        return (
          <motion.div
            animate={isUnveiling ? { y: [0, -14, 0], rotate: [0, 8, -2], scale: [1, 1.18, 1.04], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] } : {}}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <TinySlip {...commonProps} />
          </motion.div>
        );
    }
  };

  const themeName = fullMemory.theme || 'modern';
  const themeConfig = MEMORY_THEMES[themeName] || MEMORY_THEMES.modern;
  const animationPreset = themeConfig.animationPreset;

  const getReadingVariants = () => {
    const themeVariants = (() => {
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
    })();

    const typeVariants = getTypeReadingVariants(type);

    return {
      initial: { ...themeVariants.initial, ...typeVariants.initial },
      animate: { ...themeVariants.animate, ...typeVariants.animate },
      exit: { ...themeVariants.exit, ...typeVariants.exit },
    };
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
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* The actual reading experience */}
            <ViewerContent memoryId={memoryId} type={type} fullMemory={fullMemory} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
