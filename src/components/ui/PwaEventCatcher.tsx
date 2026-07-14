"use client";

import { useEffect } from "react";
import { pwaStore } from "@/lib/pwa-store";

type PwaBootstrapWindow = Window & typeof globalThis & {
  __tmjBeforeInstallPrompt?: Event | null;
  __tmjCaptureBeforeInstallPrompt?: (event: Event) => void;
};

export function PwaEventCatcher() {
  useEffect(() => {
    const pwaWindow = window as PwaBootstrapWindow;
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      pwaStore.setPrompt(event);

      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] beforeinstallprompt captured");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const capturedPrompt = pwaWindow.__tmjBeforeInstallPrompt;
    if (capturedPrompt) {
      pwaStore.setPrompt(capturedPrompt);
      pwaWindow.__tmjBeforeInstallPrompt = null;
    }

    if (pwaWindow.__tmjCaptureBeforeInstallPrompt) {
      window.removeEventListener("beforeinstallprompt", pwaWindow.__tmjCaptureBeforeInstallPrompt);
      pwaWindow.__tmjCaptureBeforeInstallPrompt = undefined;
    }
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  return null;
}