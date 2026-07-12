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
