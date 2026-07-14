"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share, Smartphone, X } from "lucide-react";
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
  const [isInstructionOpen, setIsInstructionOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!isInstructionOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsInstructionOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInstructionOpen]);

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

  const instructions = isIos
    ? [
        "Open the Share menu.",
        "Choose Add to Home Screen.",
        "Confirm Add.",
      ]
    : [
        "Open the Chrome menu (three dots).",
        "Choose Install app or Add to Home screen.",
      ];

  return (
    <>
      <DropdownMenuItem
        className="min-h-11 cursor-pointer"
        disabled={isPrompting}
        onClick={() => {
          if (hasNativePrompt) {
            void handleInstall();
          } else {
            setIsInstructionOpen(true);
          }
        }}
      >
        {hasNativePrompt ? <Download className="mr-2 h-4 w-4" /> : isIos ? <Share className="mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
        <span>{isPrompting ? "Opening install..." : label}</span>
      </DropdownMenuItem>

      {isInstructionOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[310] flex items-end justify-center bg-black/25 p-3 sm:items-center sm:p-6" onClick={() => setIsInstructionOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-instructions-title"
            className="w-full max-w-sm rounded-[1.2rem] border border-stone-200 bg-[var(--surface-paper)] p-5 text-stone-800 shadow-2xl dark:border-stone-700 dark:text-stone-100"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">The Memory Jar</p>
                <h2 id="pwa-install-instructions-title" className="mt-1 font-cormorant text-2xl leading-none">
                  {isIos ? "Add to Home Screen" : "Install from Chrome"}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsInstructionOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close install instructions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-5 space-y-3 font-inter text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {instructions.map((instruction, index) => (
                <li key={instruction} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">{index + 1}</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setIsInstructionOpen(false)}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-900 px-4 font-inter text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-stone-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Got it
            </button>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}