import { Lightbulb } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";
export function ThoughtKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  return <CompactKeepsakeShell {...props} preview={<div className="flex h-full items-center justify-center text-amber-800"><Lightbulb className="h-7 w-7" /></div>} icon={<Lightbulb className="h-3.5 w-3.5" />} label="Thought" excerpt={metadata.preview} />;
}
