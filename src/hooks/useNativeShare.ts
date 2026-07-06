"use client";

export interface NativeSharePayload {
  title?: string;
  text?: string;
  url?: string;
}

export function useNativeShare() {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const share = async (payload: NativeSharePayload) => {
    if (!canShare) return false;
    try {
      await navigator.share(payload);
      return true;
    } catch {
      return false;
    }
  };

  return { canShare, share };
}
