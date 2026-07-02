"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { usePhysics } from "./physics-provider";

interface MemoryViewerContextType {
  viewingMemoryId: string | null;
  navigateDirection: "next" | "prev" | null;
  openViewer: (id: string, direction?: "next" | "prev") => void;
  closeViewer: () => void;
}

const MemoryViewerContext = createContext<MemoryViewerContextType | undefined>(undefined);

export function MemoryViewerProvider({ children }: { children: ReactNode }) {
  const [viewingMemoryId, setViewingMemoryId] = useState<string | null>(null);
  const [navigateDirection, setNavigateDirection] = useState<"next" | "prev" | null>(null);
  const { pauseEngine, resumeEngine } = usePhysics();

  const openViewer = (id: string, direction?: "next" | "prev") => {
    setNavigateDirection(direction || null);
    setViewingMemoryId(id);
    pauseEngine();
  };

  const closeViewer = () => {
    setNavigateDirection(null);
    setViewingMemoryId(null);
    resumeEngine();
  };

  return (
    <MemoryViewerContext.Provider value={{ viewingMemoryId, navigateDirection, openViewer, closeViewer }}>
      {children}
    </MemoryViewerContext.Provider>
  );
}

export function useMemoryViewer() {
  const context = useContext(MemoryViewerContext);
  if (context === undefined) {
    throw new Error("useMemoryViewer must be used within a MemoryViewerProvider");
  }
  return context;
}
