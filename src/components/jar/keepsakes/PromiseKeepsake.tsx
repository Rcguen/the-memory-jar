import { HeartHandshake } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";
export function PromiseKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  return <CompactKeepsakeShell {...props} preview={<div className="flex h-full items-center justify-center text-rose-700"><HeartHandshake className="h-7 w-7" /></div>} icon={<HeartHandshake className="h-3.5 w-3.5" />} label="Promise" excerpt={metadata.preview} />;
}
