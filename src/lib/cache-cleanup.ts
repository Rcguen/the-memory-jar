"use client";

import { clearSignedUrlCache } from "@/lib/media/signed-url-cache";

export async function clearPrivateClientData() {
  clearSignedUrlCache();
  // 1. Clear private localStorage entries
  try {
    const keysToRemove = [
      "lastOpenedMemoryId",
      "lastOpenedAt",
      "memory_jar_draft",
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.error("Failed to clear local storage", e);
  }

  // 2. Clear private runtime caches owned by the app
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      const privateCaches = keys.filter((key) => 
        key.startsWith("tmj-private-") || 
        key.startsWith("tmj-runtime-") || 
        key.startsWith("tmj-user-")
      );
      await Promise.all(privateCaches.map((key) => caches.delete(key)));
    } catch (e) {
      console.error("Failed to clear runtime caches", e);
    }
  }
}
