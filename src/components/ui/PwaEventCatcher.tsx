"use client";

import { useEffect } from "react";
import { pwaStore } from "@/lib/pwa-store";

type PwaBootstrapWindow = Window & typeof globalThis & {
  __tmjBeforeInstallPrompt?: Event | null;
};

export function PwaEventCatcher() {
  useEffect(() => {
    const pwaWindow = window as PwaBootstrapWindow;
    const consumeCapturedPrompt = () => {
      const capturedPrompt = pwaWindow.__tmjBeforeInstallPrompt;
      if (!capturedPrompt) return;

      pwaStore.setPrompt(capturedPrompt);
      pwaWindow.__tmjBeforeInstallPrompt = null;

      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] beforeinstallprompt captured");
      }
    };

    window.addEventListener("tmj:beforeinstallprompt", consumeCapturedPrompt);
    consumeCapturedPrompt();

    return () => {
      window.removeEventListener("tmj:beforeinstallprompt", consumeCapturedPrompt);
    };
  }, []);

  return null;
}