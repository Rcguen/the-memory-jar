import { Mic } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";

export function VoiceKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  const preview = <div className="flex h-full flex-col items-center justify-center gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100/20 bg-emerald-100/10 text-emerald-100"><Mic className="h-4 w-4" /></span><div className="flex items-center gap-1" aria-hidden="true">{[7, 13, 9, 17, 11, 6, 14, 9].map((height, index) => <span key={index} className="w-1 rounded-full bg-emerald-100/60" style={{ height }} />)}</div></div>;
  return <CompactKeepsakeShell {...props} preview={preview} icon={<Mic className="h-3.5 w-3.5" />} label="Voice note" excerpt={metadata.preview || "Open in the viewer to listen."} tone="forest" />;
}

