import { Film } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";
export function VideoKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  return <CompactKeepsakeShell {...props} preview={<div className="flex h-full items-center justify-center text-amber-100"><Film className="h-7 w-7" /></div>} icon={<Film className="h-3.5 w-3.5" />} label="Video" excerpt={metadata.preview} tone="forest" />;
}
