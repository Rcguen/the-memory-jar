"use client";

type PwaStoreCallback = (prompt: Event | null) => void;

let deferredPrompt: Event | null = null;
const listeners: Set<PwaStoreCallback> = new Set();

export const pwaStore = {
  setPrompt: (prompt: Event | null) => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[pwa] beforeinstallprompt captured globally");
    }
    deferredPrompt = prompt;
    listeners.forEach((listener) => listener(prompt));
  },
  getPrompt: () => deferredPrompt,
  clearPrompt: () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(null));
  },
  subscribe: (listener: PwaStoreCallback) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};
