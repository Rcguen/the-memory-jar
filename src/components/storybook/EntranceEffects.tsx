"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!audioCtx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx = new AudioContextCtor();
    }

    return audioCtx;
  } catch {
    return null;
  }
}

async function primeEntranceAudio() {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;

  try {
    await context.resume();
  } catch {
    // Silent fallback by design.
  }
}

function playWoodThump() {
  const context = getAudioContext();
  if (!context || context.state !== "running") return;

  try {
    const now = context.currentTime;
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.085, now + 0.025);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    masterGain.connect(context.destination);

    const bodyOsc = context.createOscillator();
    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(110, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(56, now + 0.24);
    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.9, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(masterGain);

    const knockOsc = context.createOscillator();
    knockOsc.type = "triangle";
    knockOsc.frequency.setValueAtTime(260, now);
    knockOsc.frequency.exponentialRampToValueAtTime(118, now + 0.1);
    const knockFilter = context.createBiquadFilter();
    knockFilter.type = "bandpass";
    knockFilter.frequency.setValueAtTime(380, now);
    knockFilter.Q.value = 0.8;
    const knockGain = context.createGain();
    knockGain.gain.setValueAtTime(0.55, now);
    knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    knockOsc.connect(knockFilter);
    knockFilter.connect(knockGain);
    knockGain.connect(masterGain);

    bodyOsc.start(now);
    knockOsc.start(now);
    bodyOsc.stop(now + 0.34);
    knockOsc.stop(now + 0.14);
  } catch {
    // Silent fallback by design.
  }
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 9999.17) * 43758.5453;
  return value - Math.floor(value);
}

function DustParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const xSeed = seededUnit(index + 1);
        const ySeed = seededUnit(index + 31);
        const scaleSeed = seededUnit(index + 61);
        const delaySeed = seededUnit(index + 91);
        const durationSeed = seededUnit(index + 121);
        const sizeSeed = seededUnit(index + 151);

        return {
          id: index,
          x: (xSeed - 0.5) * 560,
          y: (ySeed - 0.5) * 220 - 38,
          scale: scaleSeed * 1.25 + 0.35,
          delay: delaySeed * 0.12,
          duration: durationSeed * 0.55 + 0.95,
          size: sizeSeed * 3 + 2,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-amber-100/35"
          style={{
            width: particle.size,
            height: particle.size,
            filter: "blur(1.4px)",
          }}
          initial={{ opacity: 0, x: 0, y: 10, scale: 0.4 }}
          animate={{
            opacity: [0, 0.65, 0],
            x: particle.x,
            y: particle.y,
            scale: particle.scale,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

interface EntranceSceneProps {
  children: React.ReactNode;
  onSettled: () => void;
  onSkip: () => void;
  reduceMotion: boolean;
  isOpen?: boolean;
}

export function EntranceScene({ children, onSettled, onSkip, reduceMotion, isOpen }: EntranceSceneProps) {
  const [phase, setPhase] = useState<"falling" | "impact" | "settled">(reduceMotion ? "settled" : "falling");
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!reduceMotion) return;
    onSettled();
  }, [onSettled, reduceMotion]);

  useEffect(() => {
    const handlePrime = () => {
      void primeEntranceAudio();
    };

    window.addEventListener("pointerdown", handlePrime, { passive: true });
    window.addEventListener("keydown", handlePrime);

    return () => {
      window.removeEventListener("pointerdown", handlePrime);
      window.removeEventListener("keydown", handlePrime);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  const handleImpact = useCallback(() => {
    if (reduceMotion || phase !== "falling") return;

    setPhase("impact");
    playWoodThump();

    settleTimerRef.current = window.setTimeout(() => {
      setPhase("settled");
      onSettled();
    }, 920);
  }, [onSettled, phase, reduceMotion]);

  const handleSkip = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    setPhase("settled");
    onSkip();
  }, [onSkip]);

  if (reduceMotion) {
    return <div className="absolute inset-0 flex items-center justify-center">{children}</div>;
  }

  const isSettled = phase === "settled";
  const showImpact = phase === "impact" || phase === "settled";

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-zinc-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.12),transparent_30%),radial-gradient(circle_at_50%_70%,rgba(120,53,15,0.18),transparent_42%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))]" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,235,0.09),transparent_24%,transparent_70%,rgba(120,53,15,0.08))]"
        animate={{ opacity: showImpact ? 1 : 0.4 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-[18%] h-40 bg-[radial-gradient(circle,rgba(255,248,220,0.08),transparent_65%)] blur-3xl"
        animate={{ opacity: showImpact ? 1 : 0.5, scale: showImpact ? 1.05 : 0.96 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {!isSettled && (
        <button
          type="button"
          onPointerDown={() => {
            void primeEntranceAudio();
          }}
          onClick={handleSkip}
          className="absolute right-4 top-4 z-50 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-black/30 px-4 text-sm font-medium text-zinc-100 shadow-lg backdrop-blur-md transition-colors hover:bg-black/45 md:right-8 md:top-8"
          aria-label="Skip memory book entrance"
        >
          Skip intro
        </button>
      )}

      <motion.div
        className="relative flex h-full w-full items-center justify-center px-4 py-10 md:px-10"
        style={{ perspective: "2000px" }}
        animate={
          phase === "impact"
            ? { x: [0, -6, 5, -3, 2, 0], y: [0, 3, -2, 1, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        {showImpact && <DustParticles />}

        <motion.div
          className="relative z-30 w-full flex justify-center"
          initial={{ y: "-100vh", rotateX: 35, rotateZ: -10, scale: 1.15, opacity: 1 }}
          animate={{ y: 0, rotateX: 0, rotateZ: 0, scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 150,
            damping: 18,
            mass: 2,
            restDelta: 0.001
          }}
          onAnimationComplete={handleImpact}
          onPointerDown={() => {
            void primeEntranceAudio();
          }}
        >
          <motion.div
            className="absolute inset-x-[10%] bottom-2 -z-10 h-16 rounded-full bg-black/45 blur-2xl"
            initial={{ opacity: 0.18, scaleX: 0.72 }}
            animate={{
              opacity: phase === "falling" ? 0.22 : 0.38,
              scaleX: phase === "falling" ? 0.75 : 1.04,
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />

          {children}

          <AnimatePresence>
            {isSettled && !isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="pointer-events-none absolute -bottom-18 left-1/2 w-max -translate-x-1/2"
              >
                <span className="rounded-full border border-white/12 bg-black/36 px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-amber-50/75 shadow-lg backdrop-blur-md md:text-xs">
                  Tap the cover to open
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
