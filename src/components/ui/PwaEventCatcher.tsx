"use client";

import { useEffect } from "react";
import { pwaStore } from "@/lib/pwa-store";

type PwaWindow = Window & typeof globalThis & {
  __PWA_PROMPT__?: Event | null;
};

export function PwaEventCatcher() {
  useEffect(() => {
    const pwaWindow = window as PwaWindow;

    // Check if the event was caught by the inline script in layout.tsx before React hydration.
    if (pwaWindow.__PWA_PROMPT__ && !pwaStore.getPrompt()) {
      pwaStore.setPrompt(pwaWindow.__PWA_PROMPT__);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      pwaWindow.__PWA_PROMPT__ = event;
      pwaStore.setPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}