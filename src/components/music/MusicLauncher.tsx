"use client";

import { Radio } from "lucide-react";

export function MusicLauncher({ onOpen, onIntentPrefetch }: { onOpen: () => void; onIntentPrefetch: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open Our Little Radio"
      onClick={onOpen}
      onPointerEnter={onIntentPrefetch}
      onPointerDown={onIntentPrefetch}
      onFocus={onIntentPrefetch}
      className="music-launcher focus-ring-premium"
    >
      <Radio className="h-4 w-4" aria-hidden="true" />
      <span>Our Little Radio</span>
    </button>
  );
}