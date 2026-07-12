import { Plane } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";
export function TravelKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  return <CompactKeepsakeShell {...props} preview={<div className="flex h-full items-center justify-center text-sky-800"><Plane className="h-7 w-7" /></div>} icon={<Plane className="h-3.5 w-3.5" />} label="Travel" excerpt={metadata.preview} />;
}
