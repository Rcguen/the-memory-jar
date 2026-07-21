"use client";

import { Radio } from "lucide-react";

export function MusicLauncher({ isOpen, onOpen, onIntentPrefetch }: { isOpen: boolean; onOpen: () => void; onIntentPrefetch: () => void }) {
  return (
    <button
      type="button"
      aria-label={isOpen ? "Our Little Radio is open" : "Open Our Little Radio"}
      aria-pressed={isOpen}
      onClick={onOpen}
      onPointerEnter={onIntentPrefetch}
      onPointerDown={onIntentPrefetch}
      onFocus={onIntentPrefetch}
      className="music-launcher focus-ring-premium"
    >
      <Radio className="h-4 w-4" aria-hidden="true" />
      <span>{isOpen ? "Radio open" : "Our Little Radio"}</span>
    </button>
  );
}