"use client";

import { useEffect } from "react";
import { pwaStore } from "@/lib/pwa-store";

export function PwaEventCatcher() {
  useEffect(() => {
    // Check if the event was caught by the inline script in layout.tsx before React hydration
    if (typeof window !== "undefined" && (window as any).__PWA_PROMPT__ && !pwaStore.getPrompt()) {
      pwaStore.setPrompt((window as any).__PWA_PROMPT__);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (typeof window !== "undefined") {
        (window as any).__PWA_PROMPT__ = e;
      }
      pwaStore.setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
