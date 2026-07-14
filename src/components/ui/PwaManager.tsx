"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { pwaStore } from "@/lib/pwa-store";

const OFFLINE_TOAST_ID = "pwa-offline-status";
type InstallGuidePlatform = "ios" | "chromium";

export function PwaManager() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [installGuidePlatform, setInstallGuidePlatform] = useState<InstallGuidePlatform | null>(null);
  const closeGuideButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const showOfflineToast = () => {
      toast("You're offline", {
        id: OFFLINE_TOAST_ID,
        description: "Some features may wait until your connection returns.",
        duration: Infinity,
        icon: <WifiOff className="h-4 w-4" />,
      });
    };
    const handleOffline = () => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] connectivity changed", { online: navigator.onLine });
      }
      setIsOffline(true);
      showOfflineToast();
    };
    const handleOnline = () => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] connectivity changed", { online: navigator.onLine });
      }
      setIsOffline(false);
      toast.dismiss(OFFLINE_TOAST_ID);
    };

    if (navigator.onLine) {
      toast.dismiss(OFFLINE_TOAST_ID);
    } else {
      showOfflineToast();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleAppInstalled = () => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] appinstalled received");
      }
      pwaStore.clearPrompt();
      setInstallGuidePlatform(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator && "serwist" in window) {
      const handleSerwistInstalled = (event: Event) => {
        if ((event as unknown as { isUpdate: boolean }).isUpdate) {
          toast.success("App updated. Restart when you're ready.", {
            action: {
              label: "Restart",
              onClick: () => window.location.reload(),
            },
            duration: Infinity,
          });
        }
      };

      (window as unknown as { serwist: EventTarget }).serwist.addEventListener("installed", handleSerwistInstalled);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("appinstalled", handleAppInstalled);
        (window as unknown as { serwist: EventTarget }).serwist.removeEventListener("installed", handleSerwistInstalled);
      };
    }

    if ("serviceWorker" in navigator) {
      const handleControllerChange = () => {
        toast("App updated. Restart when you're ready.", {
          action: {
            label: "Restart",
            onClick: () => window.location.reload(),
          },
          duration: Infinity,
        });
      };

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("appinstalled", handleAppInstalled);
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        pwaStore.clearPrompt();
        setInstallGuidePlatform(null);
      }
    };

    mediaQuery.addEventListener("change", handleDisplayModeChange);
    return () => mediaQuery.removeEventListener("change", handleDisplayModeChange);
  }, []);

  useEffect(() => {
    const handleOpenInstallGuide = (event: Event) => {
      const platform = (event as CustomEvent<InstallGuidePlatform>).detail;
      if (platform === "ios" || platform === "chromium") {
        setInstallGuidePlatform(platform);
      }
    };

    window.addEventListener("tmj:open-install-guide", handleOpenInstallGuide);
    return () => window.removeEventListener("tmj:open-install-guide", handleOpenInstallGuide);
  }, []);

  useEffect(() => {
    if (!installGuidePlatform) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInstallGuidePlatform(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    closeGuideButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [installGuidePlatform]);

  const instructions = installGuidePlatform === "ios"
    ? ["Open the Share menu.", "Choose Add to Home Screen.", "Confirm Add."]
    : ["Open the Chrome menu (three dots).", "Choose Install app or Add to Home screen."];

  return (
    <>
      <span className="sr-only" aria-live="polite" suppressHydrationWarning>
        {isOffline ? "You're offline" : "You're online"}
      </span>

      {installGuidePlatform && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[310] flex items-end justify-center bg-black/25 p-3 sm:items-center sm:p-6"
          onClick={() => setInstallGuidePlatform(null)}
        >
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
                  {installGuidePlatform === "ios" ? "Add to Home Screen" : "Install from Chrome"}
                </h2>
              </div>
              <button
                ref={closeGuideButtonRef}
                type="button"
                onClick={() => setInstallGuidePlatform(null)}
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
              onClick={() => setInstallGuidePlatform(null)}
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