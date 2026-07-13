/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;


type PushNotificationPayload = {
  title?: unknown;
  body?: unknown;
  tag?: unknown;
  type?: unknown;
  url?: unknown;
};

function getSafeNotificationPayload(event: PushEvent) {
  const fallback = {
    title: "The Memory Jar",
    body: "Something new is waiting in your jar.",
    tag: "the-memory-jar",
    type: "unknown",
    url: "/",
  };

  if (!event.data) return fallback;

  try {
    const parsed = event.data.json() as PushNotificationPayload;
    const safeUrl = typeof parsed.url === "string" && parsed.url.startsWith("/") && !parsed.url.startsWith("//")
      ? parsed.url
      : fallback.url;

    return {
      title: typeof parsed.title === "string" ? parsed.title.slice(0, 80) : fallback.title,
      body: typeof parsed.body === "string" ? parsed.body.slice(0, 160) : fallback.body,
      tag: typeof parsed.tag === "string" ? parsed.tag.slice(0, 120) : fallback.tag,
      type: typeof parsed.type === "string" ? parsed.type.slice(0, 60) : fallback.type,
      url: safeUrl,
    };
  } catch {
    return fallback;
  }
}

self.addEventListener("push", (event) => {
  const payload = getSafeNotificationPayload(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: {
        type: payload.type,
        url: payload.url,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data as { url?: unknown } | undefined;
  const rawUrl = notificationData?.url;
  const targetUrl = typeof rawUrl === "string" && rawUrl.startsWith("/") && !rawUrl.startsWith("//")
    ? rawUrl
    : "/";

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const target = new URL(targetUrl, self.location.origin).href;

    for (const client of windowClients) {
      if (client.url === target && "focus" in client) {
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ==========================================
    // STRICT SECURITY EXCLUSIONS
    // These NetworkOnly rules must run before defaultCache
    // ==========================================
    {
      matcher: ({ request, url }) => {
        // 1. Exclude mutating methods
        if (request.method !== "GET" && request.method !== "HEAD") return true;
        
        // 2. Exclude Next.js Server Actions and RSC streams
        if (request.headers.has("Next-Action") || request.headers.has("RSC") || request.headers.get("Accept")?.includes("text/x-component")) {
          return true;
        }

        // 3. Exclude Supabase endpoints (Auth, REST, Realtime, Storage)
        if (url.origin.includes("supabase.co") || url.origin.includes("supabase.in")) return true;
        
        // 4. Exclude specific private paths if any
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return true;
        
        return false;
      },
      handler: new NetworkOnly(),
    },
    
    // ==========================================
    // PUBLIC STATIC ASSETS AND SHELL CACHING
    // ==========================================
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
