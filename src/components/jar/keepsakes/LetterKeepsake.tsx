import { FileText } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";

export function LetterKeepsake(props: KeepsakeLayoutProps) {
  const { metadata } = props;
  const preview = <div className="h-full bg-[repeating-linear-gradient(0deg,transparent_0_1.2rem,rgba(85,110,132,0.15)_1.2rem_1.26rem)] p-3"><FileText className="h-5 w-5 text-rose-700/70" /><span className="mt-3 block h-px w-12 bg-stone-400/40" /><span className="mt-2 block h-px w-16 bg-stone-400/30" /><span className="mt-2 block h-px w-10 bg-stone-400/25" /></div>;
  return <CompactKeepsakeShell {...props} preview={preview} icon={<FileText className="h-3.5 w-3.5" />} label="Letter" excerpt={metadata.preview || "A letter kept safely in the jar."} />;
}
