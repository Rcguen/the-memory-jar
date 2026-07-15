"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePhysics } from "@/providers/physics-provider";
import { MemoryObjectFactory } from "./objects/MemoryObjectFactory";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";

interface GlassJarProps {
  memoryCount: number;
  ambientMotionActive?: boolean;
  isPhone?: boolean;
}

export function GlassJar({
  memoryCount,
  ambientMotionActive = true,
  isPhone = false,
}: GlassJarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; pointerId: number; pointerType: string } | null>(null);
  const { states, setContainerRef } = usePhysics();
  const { viewingMemoryId, openViewer } = useMemoryViewer();
  const reduceMotion = useReducedMotion();

  const [isZoomed, setIsZoomed] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [2, -2]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-2, 2]), { stiffness: 100, damping: 30 });

  const [partnerOnline, setPartnerOnline] = useState(false);

  useEffect(() => {
    const handleHeartbeat = (e: Event) => {
      const customEvent = e as CustomEvent<{ active?: boolean }>;
      setPartnerOnline(Boolean(customEvent.detail?.active));
    };

    window.addEventListener("jar-heartbeat-active", handleHeartbeat);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("jar-heartbeat-active", handleHeartbeat);
    };
  }, []);

  useEffect(() => {
    if (ambientMotionActive && !reduceMotion && !isPhone) return;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastPointerRef.current = null;
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [ambientMotionActive, isPhone, mouseX, mouseY, reduceMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !ambientMotionActive || isPhone) return;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (!containerRef.current || !lastPointerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (lastPointerRef.current.x - rect.left) / rect.width;
      const y = (lastPointerRef.current.y - rect.top) / rect.height;
      mouseX.set(x);
      mouseY.set(y);
    });
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const handleOpenMemory = (id: string) => {
    if (viewingMemoryId === id) return;

    openViewer(id);
    setIsZoomed(true);
    setTimeout(() => setIsZoomed(false), 2000);
  };

  const findMemoryNearPoint = (
    target: HTMLDivElement,
    clientX: number,
    clientY: number,
    pointerType: string
  ) => {
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const isTouch = pointerType === "touch";
    const radius = isTouch ? 128 : 76;
    const fallbackRadius = isTouch ? 178 : radius;
    const lowerJarTap = pointerY > rect.height * 0.44;

    const closest = states.reduce<{ id: string; distance: number; score: number } | null>((nearest, state) => {
      const centerX = state.x * rect.width;
      const centerY = state.y * rect.height;
      const dx = pointerX - centerX;
      const dy = pointerY - centerY;
      const distance = Math.hypot(dx, dy);
      const inPrimaryHit = distance <= radius;
      const inTouchFallback = isTouch && lowerJarTap && distance <= fallbackRadius;

      if (!inPrimaryHit && !inTouchFallback) return nearest;

      const score = distance - (isTouch ? state.y * 18 : 0);
      if (!nearest || score < nearest.score) {
        return { id: state.id, distance, score };
      }

      return nearest;
    }, null);

    return closest?.id ?? null;
  };

  const releasePointer = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  };

  const handleContentsPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (states.length === 0 || viewingMemoryId) return;

    tapStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleContentsPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (states.length === 0 || viewingMemoryId) return;

    const start = tapStartRef.current;
    tapStartRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);

    const pointerType = event.pointerType || start?.pointerType || "mouse";
    const movement = start ? Math.hypot(event.clientX - start.x, event.clientY - start.y) : 0;
    const movementLimit = pointerType === "touch" ? 32 : 12;
    if (movement > movementLimit) return;

    const closest = findMemoryNearPoint(event.currentTarget, event.clientX, event.clientY, pointerType);

    if (closest) {
      handleOpenMemory(closest);
    }
  };

  const handleContentsPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    tapStartRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);
  };

  const [jarClicks, setJarClicks] = useState(0);
  const [hiddenWhisper, setHiddenWhisper] = useState<string | null>(null);

  const handleJarClick = () => {
    setJarClicks((prev) => {
      const next = prev + 1;
      if (next === 7) {
        setHiddenWhisper("The jar feels warm today.");
        setTimeout(() => setHiddenWhisper(null), 4000);
      }
      return next;
    });
  };

  return (
    <motion.div
      ref={(node) => {
        containerRef.current = node;
        setContainerRef(node);
      }}
      className={`relative mx-auto h-[21rem] w-[15.5rem] cursor-pointer perspective-[1000px] z-20 transition-all duration-700 ease-in-out sm:h-96 sm:w-72 md:h-[28rem] md:w-80 ${isZoomed ? "scale-[1.05] drop-shadow-2xl" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleJarClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: isZoomed ? 1.05 : 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {hiddenWhisper && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-amber-100/60 font-cormorant italic whitespace-nowrap pointer-events-none"
        >
          {hiddenWhisper}
        </motion.div>
      )}

      {isZoomed && (
        <div className="fixed inset-0 bg-black/60 -z-10 transition-opacity duration-700" />
      )}

      <motion.div
        className="absolute inset-0 z-[-1] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.25)_0%,transparent_70%)] pointer-events-none"
        initial={false}
        animate={{
          opacity: partnerOnline ? 0.88 : 0,
          scale: partnerOnline ? 1.14 : 0.94,
        }}
        transition={
          partnerOnline
            ? { duration: 0.45, ease: "easeOut" }
            : { duration: 1.8, ease: "easeOut" }
        }
      />

      {/* Layer 2: Subtle Ambient Emotion Light */}
      <motion.div
        className="absolute inset-0 z-[-2] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.15)_0%,transparent_65%)] pointer-events-none"
        animate={
          ambientMotionActive && !reduceMotion && !isPhone
            ? { opacity: [0.3, 0.4, 0.3], scale: [1, 1.05, 1] }
            : { opacity: 0.34, scale: 1 }
        }
        transition={
          ambientMotionActive && !reduceMotion && !isPhone
            ? { duration: 8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      />

      <motion.div
        className="w-full h-full relative"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={ambientMotionActive && !reduceMotion ? { y: [0, -2, 0] } : { y: 0 }}
        transition={
          ambientMotionActive && !reduceMotion
            ? { duration: 6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        <div className="absolute inset-0 pointer-events-none" />

        <div className="absolute inset-0 pointer-events-none z-10">
          <Image
            src="/Jar-Background-PNG.png"
            alt="Jar"
            fill
            sizes="(min-width: 768px) 20rem, 18rem"
            className="object-contain"
            priority
          />
        </div>

        <svg
          viewBox="0 0 400 500"
          className="w-full h-full drop-shadow-2xl overflow-visible relative z-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="backGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="frontGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="15%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="85%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="glassEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="5%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="95%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="corkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8c6239" />
              <stop offset="50%" stopColor="#b6895b" />
              <stop offset="100%" stopColor="#5c3a21" />
            </linearGradient>
          </defs>

          <g id="layer-contents">
            <foreignObject x="0" y="0" width="400" height="500">
              <div
                className="relative h-full w-full translate-y-[2%] pointer-events-auto select-none sm:translate-y-0"
                style={{ touchAction: "manipulation" }}
                onPointerDown={handleContentsPointerDown}
                onPointerUp={handleContentsPointerUp}
                onPointerCancel={handleContentsPointerCancel}
              >
                {states.map((state) => (
                  <MemoryObjectFactory key={state.id} state={state} onClick={handleOpenMemory} />
                ))}
              </div>
            </foreignObject>

            {states.length === 0 && memoryCount === 0 && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.65, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M200 380 L202 388 L210 390 L202 392 L200 400 L198 392 L190 390 L198 388 Z" fill="#ffffff" opacity="0.9" />
              </motion.g>
            )}
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
