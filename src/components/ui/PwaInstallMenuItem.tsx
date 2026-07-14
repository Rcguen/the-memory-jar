"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { pwaStore } from "@/lib/pwa-store";

interface DeferredInstallPrompt extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator
      && Boolean((window.navigator as unknown as { standalone?: boolean }).standalone));
}

function isIosBrowser() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isChromiumBrowser() {
  return /Chrome|Chromium|CriOS|Edg|OPR/.test(navigator.userAgent) && !isIosBrowser();
}

export function PwaInstallMenuItem() {
  const [isReady, setIsReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isChromium, setIsChromium] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const syncInstallState = () => setIsInstalled(isStandalone());
    const setupTimer = window.setTimeout(() => {
      setIsIos(isIosBrowser());
      setIsChromium(isChromiumBrowser());
      syncInstallState();
      setIsReady(true);
    }, 0);
    const unsubscribe = pwaStore.subscribe(setDeferredPrompt);
    const handleAppInstalled = () => {
      setIsInstalled(true);
      pwaStore.clearPrompt();
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", syncInstallState);

    return () => {
      window.clearTimeout(setupTimer);
      unsubscribe();
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", syncInstallState);
    };
  }, []);

  if (!isReady || isInstalled) return null;

  const hasNativePrompt = Boolean(deferredPrompt);
  const canShowGuidance = isIos || isChromium;
  if (!hasNativePrompt && !canShowGuidance) return null;

  const label = hasNativePrompt
    ? "Install app"
    : isIos
      ? "Add to Home Screen"
      : "How to install";

  const handleInstall = async () => {
    const promptEvent = deferredPrompt as DeferredInstallPrompt | null;
    if (!promptEvent || isPrompting) return;

    setIsPrompting(true);
    try {
      promptEvent.prompt();
      pwaStore.clearPrompt();
      await promptEvent.userChoice;
    } finally {
      pwaStore.clearPrompt();
      setIsPrompting(false);
    }
  };

  const handleSelect = () => {
    if (hasNativePrompt) {
      void handleInstall();
      return;
    }

    window.dispatchEvent(new CustomEvent("tmj:open-install-guide", {
      detail: isIos ? "ios" : "chromium",
    }));
  };

  return (
    <DropdownMenuItem
      className="min-h-11 cursor-pointer"
      disabled={isPrompting}
      onClick={handleSelect}
    >
      {hasNativePrompt ? <Download className="mr-2 h-4 w-4" /> : isIos ? <Share className="mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
      <span>{isPrompting ? "Opening install..." : label}</span>
    </DropdownMenuItem>
  );
}