"use client";

import { useEffect } from "react";
import { pwaStore } from "@/lib/pwa-store";

export function PwaEventCatcher() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      pwaStore.setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
