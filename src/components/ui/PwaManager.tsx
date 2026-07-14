"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { pwaStore } from "@/lib/pwa-store";

const OFFLINE_TOAST_ID = "pwa-offline-status";

export function PwaManager() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );

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
      if (event.matches) pwaStore.clearPrompt();
    };

    mediaQuery.addEventListener("change", handleDisplayModeChange);
    return () => mediaQuery.removeEventListener("change", handleDisplayModeChange);
  }, []);

  return (
    <span className="sr-only" aria-live="polite" suppressHydrationWarning>
      {isOffline ? "You're offline" : "You're online"}
    </span>
  );
}
