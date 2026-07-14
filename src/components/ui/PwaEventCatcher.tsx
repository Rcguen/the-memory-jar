"use client";

import { useEffect } from "react";
import { pwaStore } from "@/lib/pwa-store";

export function PwaEventCatcher() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      pwaStore.setPrompt(event);

      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] beforeinstallprompt captured");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  return null;
}