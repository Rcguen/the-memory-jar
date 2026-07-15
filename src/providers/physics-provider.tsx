"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from "react";
import { EngineCore, NormalizedVisualState } from "@/lib/physics/EngineCore";
import { MemoryType } from "@/types/memory";
import { useVisualStatePersistence } from "@/hooks/useVisualStatePersistence";
import { MotionValue } from "framer-motion";

export type PhysicsPauseReason = "memory-modal" | "memory-viewer" | "document-hidden" | "page-hidden";

interface PhysicsContextType {
  states: NormalizedVisualState[];
  setContainerRef: (node: HTMLDivElement | null) => void;
  dropMemory: (id: string, type: MemoryType, stateExt?: { status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }) => void;
  loadMemory: (id: string, type: MemoryType, state: NormalizedVisualState) => void;
  removeMemory: (id: string) => void;
  updateMemoryMeta: (id: string, meta: Partial<{ status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }>) => void;
  pokeMemory: (id: string) => void;
  pausePhysics: (reason: PhysicsPauseReason) => void;
  resumePhysics: (reason: PhysicsPauseReason) => void;
  isPhysicsRunning: boolean;
  registerMotionValues: (id: string, x: MotionValue<number | string>, y: MotionValue<number | string>, rotate: MotionValue<number | string>) => void;
  unregisterMotionValues: (id: string) => void;
}

const PhysicsContext = createContext<PhysicsContextType | undefined>(undefined);
const isDevelopment = process.env.NODE_ENV === "development";

export function PhysicsProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<EngineCore | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [states, setStates] = useState<NormalizedVisualState[]>([]);
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(false);
  const statesRef = useRef<NormalizedVisualState[]>([]);
  const motionValuesRef = useRef<Map<string, { x: MotionValue<number | string>, y: MotionValue<number | string>, rotate: MotionValue<number | string> }>>(new Map());
  const pauseReasonsRef = useRef<Set<PhysicsPauseReason>>(new Set());
  const isProviderMountedRef = useRef(false);

  const syncRunner = useCallback(() => {
    const core = engineRef.current;
    if (!core || core.destroyed) return;

    const shouldRun = pauseReasonsRef.current.size === 0;
    const changed = shouldRun ? core.resume() : core.pause();
    const running = core.isRunning();

    if (isProviderMountedRef.current) {
      setIsPhysicsRunning((current) => current === running ? current : running);
    }

    if (isDevelopment && changed) {
      const diagnostics = core.getLifecycleDiagnostics();
      console.debug("[physics-lifecycle]", {
        running: diagnostics.running,
        pauseReasonCount: pauseReasonsRef.current.size,
        startCount: diagnostics.startCount,
        stopCount: diagnostics.stopCount,
        reasons: Array.from(pauseReasonsRef.current),
      });
    }
  }, []);

  const pausePhysics = useCallback((reason: PhysicsPauseReason) => {
    const reasons = pauseReasonsRef.current;
    const previousSize = reasons.size;
    reasons.add(reason);
    if (reasons.size !== previousSize) syncRunner();
  }, [syncRunner]);

  const resumePhysics = useCallback((reason: PhysicsPauseReason) => {
    const reasons = pauseReasonsRef.current;
    const removed = reasons.delete(reason);
    if (removed) syncRunner();
  }, [syncRunner]);

  const registerMotionValues = useCallback((id: string, x: MotionValue<number | string>, y: MotionValue<number | string>, rotate: MotionValue<number | string>) => {
    motionValuesRef.current.set(id, { x, y, rotate });
  }, []);

  const unregisterMotionValues = useCallback((id: string) => {
    motionValuesRef.current.delete(id);
  }, []);

  useEffect(() => {
    const core = new EngineCore(400, 500);
    const pauseReasons = pauseReasonsRef.current;
    const motionValues = motionValuesRef.current;
    engineRef.current = core;
    isProviderMountedRef.current = true;

    core.onUpdate((newStates) => {
      for (const state of newStates) {
        const mvs = motionValuesRef.current.get(state.id);
        if (mvs) {
          mvs.x.set(`${state.x * 100}%`);
          mvs.y.set(`${state.y * 100}%`);
          mvs.rotate.set(`${state.rotation}rad`);
        }
      }

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

    core.onWake(() => undefined);

    const syncDocumentVisibility = () => {
      if (document.visibilityState === "hidden") {
        pausePhysics("document-hidden");
      } else {
        resumePhysics("document-hidden");
      }
    };
    const handlePageHide = () => pausePhysics("page-hidden");
    const handlePageShow = () => {
      resumePhysics("page-hidden");
      syncDocumentVisibility();
    };

    document.addEventListener("visibilitychange", syncDocumentVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    syncDocumentVisibility();
    syncRunner();

    return () => {
      document.removeEventListener("visibilitychange", syncDocumentVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      pauseReasons.clear();
      motionValues.clear();
      statesRef.current = [];
      isProviderMountedRef.current = false;
      if (engineRef.current === core) {
        engineRef.current = null;
      }
      core.destroy();
    };
  }, [pausePhysics, resumePhysics, syncRunner]);

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

  const removeMemory = useCallback((id: string) => {
    engineRef.current?.removeMemory(id);
  }, []);

  const updateMemoryMeta = useCallback((id: string, meta: Partial<{ status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }>) => {
    engineRef.current?.updateMemoryMeta(id, meta);
  }, []);

  const pokeMemory = useCallback((id: string) => {
    engineRef.current?.pokeMemory(id);
  }, []);

  const contextValue = useMemo(() => ({
    states,
    setContainerRef: setContainerNode,
    dropMemory,
    loadMemory,
    removeMemory,
    updateMemoryMeta,
    pokeMemory,
    pausePhysics,
    resumePhysics,
    isPhysicsRunning,
    registerMotionValues,
    unregisterMotionValues,
  }), [states, setContainerNode, dropMemory, loadMemory, removeMemory, updateMemoryMeta, pokeMemory, pausePhysics, resumePhysics, isPhysicsRunning, registerMotionValues, unregisterMotionValues]);

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
