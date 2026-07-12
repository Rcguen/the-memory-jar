import { Heart } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";
export function GratitudeKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  return <CompactKeepsakeShell {...props} preview={<div className="flex h-full items-center justify-center text-rose-700"><Heart className="h-7 w-7" /></div>} icon={<Heart className="h-3.5 w-3.5" />} label="Gratitude" excerpt={metadata.preview} />;
}
