"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  // Files are intentionally excluded because they cannot be restored safely from localStorage.
}

const DRAFT_KEY = "memory_jar_draft";
const DRAFT_DEBOUNCE_MS = 500;
const DRAFT_MAX_WAIT_MS = 1800;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function useMemoryDraft() {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const savedDraftRef = useRef<DraftState | null>(null);
  const pendingDraftRef = useRef<DraftState | null>(null);
  const draftSavedRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const idleFallbackTimerRef = useRef<number | null>(null);
  const metricsRef = useRef({ changes: 0, writes: 0 });

  const cancelScheduledWrite = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
    if (idleFallbackTimerRef.current !== null) {
      window.clearTimeout(idleFallbackTimerRef.current);
      idleFallbackTimerRef.current = null;
    }
    if (idleCallbackRef.current !== null) {
      const idleWindow = window as IdleWindow;
      idleWindow.cancelIdleCallback?.(idleCallbackRef.current);
      idleCallbackRef.current = null;
    }
  }, []);

  const flushDraft = useCallback((options?: { skipStateUpdate?: boolean }) => {
    const nextDraft = pendingDraftRef.current;
    if (!nextDraft) return false;

    cancelScheduledWrite();
    pendingDraftRef.current = null;

    try {
      const startedAt = performance.now();
      const serializedDraft = JSON.stringify(nextDraft);
      localStorage.setItem(DRAFT_KEY, serializedDraft);
      const writeDurationMs = performance.now() - startedAt;

      savedDraftRef.current = nextDraft;
      draftSavedRef.current = true;
      if (!options?.skipStateUpdate) {
        setDraft(nextDraft);
        setIsDraftSaved(true);
      }
      metricsRef.current.writes += 1;

      if (process.env.NODE_ENV === "development") {
        console.debug("[memory-draft] persisted", {
          changeCount: metricsRef.current.changes,
          writeCount: metricsRef.current.writes,
          bytes: new Blob([serializedDraft]).size,
          writeDurationMs: Number(writeDurationMs.toFixed(2)),
        });
      }
      return true;
    } catch (error) {
      // Retain the newest value in memory so a future flush can retry safely.
      pendingDraftRef.current = nextDraft;
      console.error("Failed to save memory draft", error);
      return false;
    }
  }, [cancelScheduledWrite]);

  const scheduleDraftWrite = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      const idleWindow = window as IdleWindow;
      const runWrite = () => {
        if (idleCallbackRef.current !== null) {
          idleWindow.cancelIdleCallback?.(idleCallbackRef.current);
          idleCallbackRef.current = null;
        }
        if (idleFallbackTimerRef.current !== null) {
          window.clearTimeout(idleFallbackTimerRef.current);
          idleFallbackTimerRef.current = null;
        }
        flushDraft();
      };

      if (idleWindow.requestIdleCallback) {
        idleCallbackRef.current = idleWindow.requestIdleCallback(runWrite, { timeout: 100 });
        // Do not rely solely on idle time; mobile browsers may postpone it.
        idleFallbackTimerRef.current = window.setTimeout(runWrite, 100);
      } else {
        runWrite();
      }
    }, DRAFT_DEBOUNCE_MS);

    if (maxWaitTimerRef.current === null) {
      maxWaitTimerRef.current = window.setTimeout(() => {
        maxWaitTimerRef.current = null;
        flushDraft();
      }, DRAFT_MAX_WAIT_MS);
    }
  }, [flushDraft]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsedDraft = JSON.parse(stored) as DraftState;
        savedDraftRef.current = parsedDraft;
        draftSavedRef.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(parsedDraft);
        setIsDraftSaved(true);
      }
    } catch (error) {
      console.error("Failed to load memory draft", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveDraft = useCallback((newState: Partial<DraftState>) => {
    pendingDraftRef.current = {
      ...(pendingDraftRef.current ?? savedDraftRef.current),
      ...newState,
    } as DraftState;
    metricsRef.current.changes += 1;

    // Only transition the visible status once per edit session, never per keystroke.
    if (draftSavedRef.current) {
      draftSavedRef.current = false;
      setIsDraftSaved(false);
    }
    scheduleDraftWrite();
  }, [scheduleDraftWrite]);

  const clearDraft = useCallback(() => {
    try {
      cancelScheduledWrite();
      pendingDraftRef.current = null;
      savedDraftRef.current = null;
      draftSavedRef.current = false;
      localStorage.removeItem(DRAFT_KEY);
      setDraft(null);
      setIsDraftSaved(false);
    } catch (error) {
      console.error("Failed to clear memory draft", error);
    }
  }, [cancelScheduledWrite]);

  useEffect(() => {
    const flushOnBackground = () => {
      if (document.visibilityState === "hidden") flushDraft({ skipStateUpdate: true });
    };
    const flushOnPageHide = () => flushDraft({ skipStateUpdate: true });

    document.addEventListener("visibilitychange", flushOnBackground);
    window.addEventListener("pagehide", flushOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", flushOnBackground);
      window.removeEventListener("pagehide", flushOnPageHide);
      flushDraft({ skipStateUpdate: true });
    };
  }, [flushDraft]);

  return { draft, isLoaded, isDraftSaved, saveDraft, flushDraft, clearDraft };
}
