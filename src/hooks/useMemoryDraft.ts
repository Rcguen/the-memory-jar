"use client";

import { useState, useEffect } from "react";
import { MemoryType } from "@/types/memory";

export interface DraftState {
  type: MemoryType | null;
  title: string;
  content: string;
  mood_id: string | null;
  memory_date: string;
  tags: string[];
  unlock_at?: string;
  is_collaborative?: boolean;
  theme?: string;
  decorations?: string[];
  // For file uploads, we only store metadata/names if possible, as Files can't be stringified cleanly
}

const DRAFT_KEY = "memory_jar_draft";

export function useMemoryDraft() {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load memory draft", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveDraft = (newState: Partial<DraftState>) => {
    try {
      setDraft((prev) => {
        const updated = { ...prev, ...newState } as DraftState;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Failed to save memory draft", e);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraft(null);
    } catch (e) {
      console.error("Failed to clear memory draft", e);
    }
  };

  return { draft, isLoaded, saveDraft, clearDraft };
}
