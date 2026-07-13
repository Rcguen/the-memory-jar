"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Bell, BellOff, Loader2, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationState =
  | "unsupported"
  | "ios_install_required"
  | "permission_not_requested"
  | "permission_granted_subscribed"
  | "permission_granted_unsubscribed"
  | "permission_denied"
  | "subscription_expired"
  | "temporarily_unavailable";

type PushStatusResponse = {
  supported: boolean;
  vapidPublicKey: string | null;
  activeSubscriptionCount: number;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getSubscriptionPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
  };
}

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
}

function isAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function NotificationSettingsCard() {
  const [state, setState] = useState<NotificationState>("temporarily_unavailable");
  const [status, setStatus] = useState<PushStatusResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const supportedByBrowser = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!supportedByBrowser) {
      setState("unsupported");
      return;
    }

    if (isAppleMobile() && !isStandaloneDisplay()) {
      setState("ios_install_required");
      return;
    }

    try {
      const response = await fetch("/api/push/status", { cache: "no-store" });
      if (!response.ok) throw new Error("status failed");
      const nextStatus = await response.json() as PushStatusResponse;
      setStatus(nextStatus);

      if (!nextStatus.supported || !nextStatus.vapidPublicKey) {
        setState("temporarily_unavailable");
        return;
      }

      if (Notification.permission === "denied") {
        setState("permission_denied");
        return;
      }

      if (Notification.permission === "default") {
        setState("permission_not_requested");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setState(nextStatus.activeSubscriptionCount > 0 ? "subscription_expired" : "permission_granted_unsubscribed");
        return;
      }

      setState("permission_granted_subscribed");
    } catch {
      setState("temporarily_unavailable");
    }
  }, [supportedByBrowser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshStatus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshStatus]);

  const handleEnable = () => {
    startTransition(async () => {
      try {
        if (!supportedByBrowser) {
          setState("unsupported");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "denied") {
          setState("permission_denied");
          return;
        }
        if (permission !== "granted") {
          setState("permission_not_requested");
          return;
        }

        const response = await fetch("/api/push/status", { cache: "no-store" });
        const nextStatus = await response.json() as PushStatusResponse;
        if (!response.ok || !nextStatus.vapidPublicKey) {
          throw new Error("Notifications are not configured yet.");
        }
        setStatus(nextStatus);

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(nextStatus.vapidPublicKey),
        });

        const payload = getSubscriptionPayload(subscription);
        if (!payload.keys.p256dh || !payload.keys.auth) {
          throw new Error("Browser did not return subscription keys.");
        }

        const saveResponse = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, deviceLabel: navigator.platform || "This device" }),
        });
        if (!saveResponse.ok) throw new Error("Could not save notification subscription.");

        setState("permission_granted_subscribed");
        toast.success("Notifications are enabled.");
      } catch (error) {
        setState("temporarily_unavailable");
        toast.error(error instanceof Error ? error.message : "Could not enable notifications.");
      }
    });
  };

  const handleDisable = () => {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setState("permission_granted_unsubscribed");
        toast.success("Notifications are disabled on this device.");
      } catch {
        toast.error("Could not disable notifications.");
      }
    });
  };

  const handleTest = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/push/test", { method: "POST" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(data.error || "Could not send test notification.");
        }
        toast.success("Test notification sent.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not send test notification.");
      }
    });
  };

  const copy = {
    unsupported: {
      title: "This browser does not support web push.",
      body: "Try Chrome, Edge, or an installed PWA on supported devices.",
    },
    ios_install_required: {
      title: "Install the app first on iPhone or iPad.",
      body: "Use Add to Home Screen, then open The Memory Jar from the Home Screen to enable notifications.",
    },
    permission_not_requested: {
      title: "Notifications are off.",
      body: "Enable them only when you want the jar to gently let you know something is waiting.",
    },
    permission_granted_subscribed: {
      title: "Notifications are ready.",
      body: "This device can receive gentle jar updates.",
    },
    permission_granted_unsubscribed: {
      title: "Permission is allowed, but this device is not subscribed.",
      body: "Enable again to reconnect this device.",
    },
    permission_denied: {
      title: "Notifications are blocked.",
      body: "Change the browser or system notification setting to enable them later.",
    },
    subscription_expired: {
      title: "This device needs to reconnect.",
      body: "Enable notifications again to refresh the browser subscription.",
    },
    temporarily_unavailable: {
      title: "Notifications are temporarily unavailable.",
      body: "VAPID keys or the notification service may not be configured in this environment yet.",
    },
  }[state];

  const canEnable = ["permission_not_requested", "permission_granted_unsubscribed", "subscription_expired", "temporarily_unavailable"].includes(state);
  const canDisable = state === "permission_granted_subscribed";
  const canTest = state === "permission_granted_subscribed";

  return (
    <div className="space-y-4">
      <div className={cn(
        "rounded-[1.1rem] border px-4 py-4",
        state === "permission_granted_subscribed"
          ? "border-emerald-400/25 bg-emerald-400/8"
          : "border-white/10 bg-white/[0.03]"
      )}>
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 p-2 text-emerald-300">
            {state === "permission_granted_subscribed" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-100">{copy.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{copy.body}</p>
            {status?.activeSubscriptionCount ? (
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {status.activeSubscriptionCount} active {status.activeSubscriptionCount === 1 ? "device" : "devices"}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {state === "ios_install_required" && (
        <div className="flex items-center gap-2 rounded-[1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-xs text-amber-100/80">
          <Smartphone className="h-4 w-4 shrink-0" />
          Open from the installed Home Screen app before enabling notifications.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canEnable && (
          <Button onClick={handleEnable} disabled={isPending} className="h-10 rounded-full px-5">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Enable notifications
          </Button>
        )}
        {canDisable && (
          <Button onClick={handleDisable} disabled={isPending} variant="outline" className="h-10 rounded-full border-white/10 bg-white/[0.03] px-5 text-zinc-100 hover:bg-white/[0.06]">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
            Disable notifications
          </Button>
        )}
        {canTest && (
          <Button onClick={handleTest} disabled={isPending} variant="outline" className="h-10 rounded-full border-white/10 bg-white/[0.03] px-5 text-zinc-100 hover:bg-white/[0.06]">
            <Send className="mr-2 h-4 w-4" />
            Send test
          </Button>
        )}
      </div>
    </div>
  );
}
