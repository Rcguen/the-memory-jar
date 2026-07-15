"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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

  const openViewer = (id: string, direction?: "next" | "prev") => {
    setNavigateDirection(direction || null);
    setViewingMemoryId(id);
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("lastOpenedMemoryId", id);
        localStorage.setItem("lastOpenedAt", Date.now().toString());
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  };

  const closeViewer = () => {
    setNavigateDirection(null);
    setViewingMemoryId(null);
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
