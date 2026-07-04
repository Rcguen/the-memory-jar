"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePhysics } from "@/providers/physics-provider";
import { MemoryObjectFactory } from "./objects/MemoryObjectFactory";
import { useMemoryViewer } from "@/providers/memory-viewer-provider";

interface GlassJarProps {
  memoryCount: number;
}

export function GlassJar({ memoryCount }: GlassJarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; pointerId: number; pointerType: string } | null>(null);
  const { states, setContainerRef } = usePhysics();
  const { viewingMemoryId, openViewer } = useMemoryViewer();
  const reduceMotion = useReducedMotion();
  
  // Cinematic zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  
  // Mouse position values for the sweeping highlight and 3D rotation
  const mouseX = useMotionValue(0.5); // 0 to 1
  const mouseY = useMotionValue(0.5); // 0 to 1

  // Smooth springs for rotation (very subtle, max 2-3 degrees)
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [2, -2]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-2, 2]), { stiffness: 100, damping: 30 });

  const [partnerOnline, setPartnerOnline] = useState(false);

  useEffect(() => {
    const handleHeartbeat = (e: Event) => {
      const customEvent = e as CustomEvent;
      setPartnerOnline(customEvent.detail.active);
    };

    window.addEventListener("jar-heartbeat-active", handleHeartbeat);
    
    // Debug toggle for the user to test the glow (Ctrl + G)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'g' && e.ctrlKey) {
        setPartnerOnline(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("jar-heartbeat-active", handleHeartbeat);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
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
    // Return to center when mouse leaves
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

  return (
    <motion.div
      ref={(node) => {
        containerRef.current = node;
        setContainerRef(node);
      }}
      className={`relative w-72 h-96 md:w-80 md:h-[28rem] mx-auto cursor-pointer perspective-[1000px] z-20 transition-all duration-700 ease-in-out ${isZoomed ? "scale-[1.05] drop-shadow-2xl" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: isZoomed ? 1.05 : 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Background Blur Overlay for Cinematic Zoom */}
      {isZoomed && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 transition-opacity duration-700" />
      )}

      {/* Glow when partner is online - Outside preserve-3d to avoid clipping bugs */}
      <AnimatePresence>
        {partnerOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
            className="absolute inset-0 z-[-1] bg-emerald-400/50 blur-[50px] rounded-full pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Container for 3D Transform and Breathing Animation */}
      <motion.div 
        className="w-full h-full relative"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" />

        {/* The custom Jar image loaded via Next.js Image for instant preloading */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <Image 
            src="/Jar-Background-PNG.png" 
            alt="Jar" 
            fill 
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
            {/* Gradients to simulate premium crystal glass */}
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
            
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <filter id="heavyShadow" x="-30%" y="-10%" width="160%" height="150%">
              <feGaussianBlur stdDeviation="20" />
            </filter>
          </defs>

          {/* 1. Contents (Where the memories go - Behind the jar glass!) */}
          <g id="layer-contents">
            <foreignObject x="0" y="0" width="400" height="500">
              <div
                className="relative w-full h-full pointer-events-auto select-none"
                style={{ touchAction: "manipulation" }}
                onPointerDown={handleContentsPointerDown}
                onPointerUp={handleContentsPointerUp}
                onPointerCancel={handleContentsPointerCancel}
              >
                {states.map(state => (
                  <MemoryObjectFactory key={state.id} state={state} onClick={handleOpenMemory} />
                ))}
              </div>
            </foreignObject>

            {states.length === 0 && memoryCount === 0 && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
              >
                {/* Tiny sparkle waiting for a memory */}
                <path d="M200 380 L202 388 L210 390 L202 392 L200 400 L198 392 L190 390 L198 388 Z" fill="#ffffff" filter="url(#glowFilter)" />
              </motion.g>
            )}
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
