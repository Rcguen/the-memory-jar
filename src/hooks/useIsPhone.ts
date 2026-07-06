"use client";

import { useSyncExternalStore } from "react";

const PHONE_MEDIA_QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const media = window.matchMedia(PHONE_MEDIA_QUERY);
  const listener = () => callback();
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(PHONE_MEDIA_QUERY).matches;
}

export function useIsPhone() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
