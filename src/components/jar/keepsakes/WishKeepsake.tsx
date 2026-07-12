import { Star } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";
export function WishKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  return <CompactKeepsakeShell {...props} preview={<div className="flex h-full items-center justify-center text-amber-700"><Star className="h-7 w-7" /></div>} icon={<Star className="h-3.5 w-3.5" />} label="Wish" excerpt={metadata.preview} />;
}
