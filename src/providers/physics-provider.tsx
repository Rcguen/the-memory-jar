"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from "react";
import { EngineCore, NormalizedVisualState } from "@/lib/physics/EngineCore";
import { MemoryType } from "@/types/memory";
import { useVisualStatePersistence } from "@/hooks/useVisualStatePersistence";
import { MotionValue } from "framer-motion";

interface PhysicsContextType {
  states: NormalizedVisualState[];
  setContainerRef: (node: HTMLDivElement | null) => void;
  dropMemory: (id: string, type: MemoryType, stateExt?: { status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }) => void;
  loadMemory: (id: string, type: MemoryType, state: NormalizedVisualState) => void;
  pokeMemory: (id: string) => void;
  pauseEngine: () => void;
  resumeEngine: () => void;
  registerMotionValues: (id: string, x: MotionValue<number | string>, y: MotionValue<number | string>, rotate: MotionValue<number | string>) => void;
  unregisterMotionValues: (id: string) => void;
}

const PhysicsContext = createContext<PhysicsContextType | undefined>(undefined);

export function PhysicsProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<EngineCore | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [states, setStates] = useState<NormalizedVisualState[]>([]);
  const statesRef = useRef<NormalizedVisualState[]>([]);
  const motionValuesRef = useRef<Map<string, { x: MotionValue<number | string>, y: MotionValue<number | string>, rotate: MotionValue<number | string> }>>(new Map());

  const registerMotionValues = useCallback((id: string, x: MotionValue<number | string>, y: MotionValue<number | string>, rotate: MotionValue<number | string>) => {
    motionValuesRef.current.set(id, { x, y, rotate });
  }, []);

  const unregisterMotionValues = useCallback((id: string) => {
    motionValuesRef.current.delete(id);
  }, []);

  useEffect(() => {
    // Initialize engine with dummy dimensions, will be updated via ResizeObserver
    engineRef.current = new EngineCore(400, 500);
    
    engineRef.current.onUpdate((newStates) => {
      // 1. Direct Motion Value updates for 60fps without React renders
      for (const state of newStates) {
        const mvs = motionValuesRef.current.get(state.id);
        if (mvs) {
          mvs.x.set(`${state.x * 100}%`);
          mvs.y.set(`${state.y * 100}%`);
          mvs.rotate.set(`${state.rotation}rad`);
        }
      }

      // 2. Diff check to only render on structural or sleep state changes
      let needsRender = false;
      if (statesRef.current.length !== newStates.length) {
        needsRender = true;
      } else {
        for (let i = 0; i < newStates.length; i++) {
          const oldState = statesRef.current[i];
          const newState = newStates[i];
          if (oldState.id !== newState.id || oldState.isSleeping !== newState.isSleeping) {
            needsRender = true;
            break;
          }
        }
      }

      if (needsRender) {
        setStates([...newStates]);
      }
      statesRef.current = newStates;
    });

    // Persistence is now handled by useVisualStatePersistence hook
    engineRef.current.onWake((id) => {
      // No longer need to manage timeouts
    });

    engineRef.current.start();

    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const observerRef = useRef<ResizeObserver | null>(null);

  useVisualStatePersistence(engineRef, statesRef);

  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    containerRef.current = node;

    if (node) {
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            engineRef.current?.updateDimensions(width, height);
          }
        }
      });

      observerRef.current.observe(node);
      
      // Initial size
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        engineRef.current?.updateDimensions(rect.width, rect.height);
      }
    }
  }, []);

  const dropMemory = useCallback((id: string, type: MemoryType, stateExt?: { status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }) => {
    engineRef.current?.dropMemory(id, type, stateExt);
  }, []);

  const loadMemory = useCallback((id: string, type: MemoryType, state: NormalizedVisualState) => {
    engineRef.current?.loadMemory(id, type, state);
  }, []);

  const pokeMemory = useCallback((id: string) => {
    engineRef.current?.pokeMemory(id);
  }, []);

  const pauseEngine = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resumeEngine = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const contextValue = useMemo(() => ({
    states,
    setContainerRef: setContainerNode,
    dropMemory,
    loadMemory,
    pokeMemory,
    pauseEngine,
    resumeEngine,
    registerMotionValues,
    unregisterMotionValues,
  }), [states, setContainerNode, dropMemory, loadMemory, pokeMemory, pauseEngine, resumeEngine, registerMotionValues, unregisterMotionValues]);

  return (
    <PhysicsContext.Provider value={contextValue}>
      {children}
    </PhysicsContext.Provider>
  );
}

export function usePhysics() {
  const context = useContext(PhysicsContext);
  if (context === undefined) {
    throw new Error("usePhysics must be used within a PhysicsProvider");
  }
  return context;
}
