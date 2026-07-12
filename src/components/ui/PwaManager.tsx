"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PwaManager() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [isIOS, setIsIOS] = useState(() => 
    typeof navigator !== "undefined" ? /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window) : false
  );
  const [isStandalone, setIsStandalone] = useState(() => 
    typeof window !== "undefined" ? window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && !!(window.navigator as unknown as { standalone: boolean }).standalone) : true
  ); // default true to prevent flash
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsStandalone(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if ("serviceWorker" in navigator && "serwist" in window) {
      (window as unknown as { serwist: EventTarget }).serwist.addEventListener("installed", (event: Event) => {
        if ((event as unknown as { isUpdate: boolean }).isUpdate) {
          toast.success("App updated. Restart when you're ready.", {
            action: {
              label: "Restart",
              onClick: () => window.location.reload(),
            },
            duration: Infinity,
          });
        }
      });
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        toast("App updated. Restart when you're ready.", {
          action: {
            label: "Restart",
            onClick: () => window.location.reload(),
          },
          duration: Infinity,
        });
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleIosInstallInstructions = () => {
    toast("To install on iOS", {
      description: "Tap the Share button at the bottom of Safari, then select 'Add to Home Screen'.",
      duration: 6000,
    });
    setDismissed(true);
  };

  if (isStandalone) {
    return (
      <>
        {isOffline && (
          <div className="fixed bottom-safe left-1/2 -translate-x-1/2 mb-4 z-[100] rounded-full border border-rose-500/20 bg-zinc-950/90 px-4 py-2 text-sm text-rose-400 shadow-[0_4px_30px_rgba(225,29,72,0.1)] backdrop-blur-md flex items-center gap-2 transition-all">
            <WifiOff className="h-4 w-4" />
            <span>You&apos;re offline</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {isOffline && (
        <div className="fixed bottom-safe left-1/2 -translate-x-1/2 mb-4 z-[100] rounded-full border border-rose-500/20 bg-zinc-950/90 px-4 py-2 text-sm text-rose-400 shadow-[0_4px_30px_rgba(225,29,72,0.1)] backdrop-blur-md flex items-center gap-2 transition-all">
          <WifiOff className="h-4 w-4" />
          <span>You&apos;re offline</span>
        </div>
      )}

      {(!isStandalone && (deferredPrompt || isIOS) && !dismissed) && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/10 bg-zinc-950/80 p-4 backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80 md:rounded-[1.2rem] md:border shadow-2xl">
          <button onClick={() => setDismissed(true)} className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300" aria-label="Dismiss install prompt">
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-3 pt-1">
            <div>
              <p className="text-sm font-medium text-zinc-100">Install The Memory Jar</p>
              <p className="text-xs text-zinc-400">For a faster, safer experience.</p>
            </div>
            
            {deferredPrompt ? (
              <Button onClick={handleInstallClick} size="sm" className="w-full rounded-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-medium">
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            ) : isIOS ? (
              <Button onClick={handleIosInstallInstructions} variant="outline" size="sm" className="w-full rounded-full border-white/10 bg-white/[0.05] text-zinc-100 hover:bg-white/[0.1]">
                How to install on iOS
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
