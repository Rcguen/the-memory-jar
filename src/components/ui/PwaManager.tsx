"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pwaStore } from "@/lib/pwa-store";
import { useAuth } from "@/providers/auth-provider";

const OFFLINE_TOAST_ID = "pwa-offline-status";
const DISMISSAL_KEY = "jar_pwa_dismissed_until";
const REMINDER_DISMISSAL_DAYS = 1;
const NATIVE_PROMPT_DISMISSAL_DAYS = 3;

type DeferredInstallPrompt = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function getPromotionHiddenReason({
  profile,
  isHydrated,
  isStandalone,
  dismissed,
  deferredPrompt,
  isIOS,
}: {
  profile: unknown;
  isHydrated: boolean;
  isStandalone: boolean;
  dismissed: boolean;
  deferredPrompt: Event | null;
  isIOS: boolean;
}) {
  if (!isHydrated) return "hydrating";
  if (!profile) return "unauthenticated";
  if (isStandalone) return "standalone";
  if (dismissed) return "cooldown";
  if (!deferredPrompt && !isIOS) return "unsupported-or-not-installable";
  return "visible";
}

export function PwaManager() {
  const { profile } = useAuth();
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [isIOS] = useState(() =>
    typeof navigator !== "undefined"
      ? /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
      : false,
  );
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(display-mode: standalone)").matches
        || ("standalone" in window.navigator
          && !!(window.navigator as unknown as { standalone: boolean }).standalone)
      : true,
  );
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(pwaStore.getPrompt());
  const [dismissed, setDismissed] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const promptConsumedRef = useRef(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const dismissedUntil = localStorage.getItem(DISMISSAL_KEY);
      setDismissed(Boolean(dismissedUntil && Date.now() < Number(dismissedUntil)));
      setIsHydrated(true);
    }, 0);

    const unsubscribe = pwaStore.subscribe(setDeferredPrompt);
    return () => {
      window.clearTimeout(hydrationTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.debug("[pwa] manager state", {
      standalone: isStandalone,
      promotion: getPromotionHiddenReason({
        profile,
        isHydrated,
        isStandalone,
        dismissed,
        deferredPrompt,
        isIOS,
      }),
    });
  }, [deferredPrompt, dismissed, isHydrated, isIOS, isStandalone, profile]);

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
      setIsStandalone(true);
      setDeferredPrompt(null);
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches);
      if (event.matches) {
        setDeferredPrompt(null);
        pwaStore.clearPrompt();
      }
    };

    mediaQuery.addEventListener("change", handleDisplayModeChange);
    return () => mediaQuery.removeEventListener("change", handleDisplayModeChange);
  }, []);

  const dismissPromotion = useCallback((days = REMINDER_DISMISSAL_DAYS) => {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSAL_KEY, String(expiry));
    setDismissed(true);
  }, []);
  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt as DeferredInstallPrompt | null;
    if (!promptEvent || promptConsumedRef.current) return;

    promptConsumedRef.current = true;
    setDeferredPrompt(null);

    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "dismissed") {
        dismissPromotion(NATIVE_PROMPT_DISMISSAL_DAYS);
      } else {
        setDismissed(true);
      }
    } finally {
      pwaStore.clearPrompt();
    }
  };
  const handleIosInstallInstructions = () => {
    toast("Add The Memory Jar to Home Screen", {
      description: "Open Safari Share, choose Add to Home Screen, then tap Add.",
      duration: 8000,
    });
    dismissPromotion();
  };

  const connectivityStatus = isOffline ? "You're offline" : "You're online";
  const canShowInstallPromotion = Boolean(
    profile
    && isHydrated
    && !isStandalone
    && !dismissed
    && (deferredPrompt || isIOS),
  );

  return (
    <>
      <span className="sr-only" aria-live="polite" suppressHydrationWarning>
        {connectivityStatus}
      </span>

      {canShowInstallPromotion && (
        <aside
          className="fixed bottom-4 left-4 right-4 z-[90] flex flex-col overflow-hidden rounded-[1.2rem] border border-stone-200 bg-[var(--surface-paper)] p-5 shadow-xl dark:border-stone-800 md:bottom-6 md:left-auto md:right-6 md:w-80"
          aria-label="Install The Memory Jar"
        >
          <button
            type="button"
            onClick={() => dismissPromotion()}
            className="absolute right-4 top-4 flex min-h-10 min-w-10 items-center justify-center text-stone-400 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:text-stone-300"
            aria-label="Dismiss install promotion"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 shadow-sm dark:bg-stone-900">
              <Image src="/icons/icon-192x192.png" alt="The Memory Jar app icon" width={48} height={48} className="object-cover" />
            </div>
            <div className="flex flex-col pr-7">
              <h2 className="font-inter text-sm font-semibold text-stone-900 dark:text-stone-100">
                The Memory Jar is available as an app
              </h2>
              <p className="mt-0.5 font-inter text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                Install it for quicker access, offline support, and a more immersive experience.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {deferredPrompt ? (
              <Button onClick={handleInstallClick} className="min-h-11 w-full rounded-full bg-stone-900 font-inter text-white transition-colors hover:bg-stone-800 motion-reduce:transition-none dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white">
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            ) : (
              <Button onClick={handleIosInstallInstructions} variant="outline" className="min-h-11 w-full rounded-full border-stone-200 bg-stone-50 font-inter text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 motion-reduce:transition-none dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100">
                How to install on iOS
              </Button>
            )}
            <Button onClick={() => dismissPromotion()} variant="ghost" className="min-h-11 w-full rounded-full font-inter text-stone-500 transition-colors hover:text-stone-700 motion-reduce:transition-none dark:hover:text-stone-300">
              Not now
            </Button>
          </div>
        </aside>
      )}
    </>
  );
}