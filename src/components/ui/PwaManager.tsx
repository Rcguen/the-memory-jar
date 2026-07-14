"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pwaStore } from "@/lib/pwa-store";
import { useAuth } from "@/providers/auth-provider";
import Image from "next/image";

const OFFLINE_TOAST_ID = "pwa-offline-status";
const DISMISSAL_KEY = "jar_pwa_dismissed_until";
const DISMISSAL_DAYS = 7;

export function PwaManager() {
  const { profile } = useAuth();
  
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );
  const [isIOS] = useState(() =>
    typeof navigator !== "undefined" ? /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window) : false
  );
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && !!(window.navigator as unknown as { standalone: boolean }).standalone) : true
  ); // default true to prevent flash
  
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(pwaStore.getPrompt());
  const [dismissed, setDismissed] = useState(true); // default true until hydrated

  useEffect(() => {
    // Hydrate dismissal state
    const dismissedUntil = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(false);
    }

    // Subscribe to store updates
    const unsubscribe = pwaStore.subscribe((prompt) => {
      setDeferredPrompt(prompt);
      if (prompt) setIsStandalone(false);
    });

    return () => unsubscribe();
  }, []);

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
      setIsOffline(true);
      showOfflineToast();
    };

    const handleOnline = () => {
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

    // Watch for appinstalled event to hide the banner natively
    const handleAppInstalled = () => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] appinstalled event received");
      }
      setIsStandalone(true);
      pwaStore.clearPrompt();
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

  // Track standalone display mode changes dynamically (e.g. if the user installs and it launches immediately)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        pwaStore.clearPrompt();
      } else {
        setIsStandalone(false);
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === "accepted") {
      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] user accepted install prompt");
      }
      pwaStore.clearPrompt();
    } else {
      if (process.env.NODE_ENV === "development") {
        console.debug("[pwa] user dismissed install prompt");
      }
      handleDismiss();
    }
  };

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    const expiry = Date.now() + DISMISSAL_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSAL_KEY, expiry.toString());
  }, []);

  const handleIosInstallInstructions = () => {
    toast("To install on iOS", {
      description: "Tap the Share button at the bottom of Safari, then select 'Add to Home Screen'.",
      duration: 8000,
    });
    handleDismiss();
  };

  const connectivityStatus = isOffline ? "You're offline" : "You're online";

  if (isStandalone) {
    return (
      <span className="sr-only" aria-live="polite" suppressHydrationWarning>
        {connectivityStatus}
      </span>
    );
  }

  // Only show the promotion when a user is logged in
  const shouldShowPromotion = !isStandalone && (deferredPrompt || isIOS) && !dismissed && profile;

  return (
    <>
      <span className="sr-only" aria-live="polite" suppressHydrationWarning>
        {connectivityStatus}
      </span>

      {shouldShowPromotion && (
        <div className="fixed bottom-4 left-4 right-4 z-[90] flex flex-col overflow-hidden rounded-[1.2rem] border border-stone-200 bg-[var(--surface-paper)] p-5 shadow-xl dark:border-stone-800 md:bottom-6 md:left-auto md:right-6 md:w-80">
          <button 
            onClick={handleDismiss} 
            className="absolute right-4 top-4 text-stone-400 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:text-stone-300" 
            aria-label="Dismiss install promotion"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 shadow-sm dark:bg-stone-900">
              <Image src="/icons/icon-192x192.png" alt="The Memory Jar App Icon" width={48} height={48} className="object-cover" />
            </div>
            <div className="flex flex-col pr-6">
              <h3 className="font-inter text-sm font-semibold text-stone-900 dark:text-stone-100">The Memory Jar</h3>
              <p className="font-inter text-xs leading-relaxed text-stone-500 dark:text-stone-400 mt-0.5">
                Install it for quicker access and a more immersive experience.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {deferredPrompt ? (
              <Button onClick={handleInstallClick} className="w-full rounded-full bg-stone-900 text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white motion-reduce:transition-none font-inter">
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            ) : isIOS ? (
              <Button onClick={handleIosInstallInstructions} variant="outline" className="w-full rounded-full border-stone-200 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100 motion-reduce:transition-none font-inter">
                How to install on iOS
              </Button>
            ) : null}
            <Button onClick={handleDismiss} variant="ghost" className="w-full rounded-full text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors motion-reduce:transition-none font-inter">
              Not now
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
