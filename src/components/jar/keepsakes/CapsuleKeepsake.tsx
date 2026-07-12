import { LockKeyhole, MailOpen } from "lucide-react";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell, WaxSeal } from "./primitives";

export function CapsuleKeepsake(props: KeepsakeLayoutProps) {
  const { memory, metadata, isLocked, isCollaborative } = props;
  const label = isLocked ? "Time capsule" : "Time capsule";
  const excerpt = isLocked ? (memory.unlock_at ? `Opens ${new Date(memory.unlock_at).toLocaleDateString()}` : "Sealed for a future moment.") : "Ready to revisit";
  const preview = <div className="relative flex h-full items-center justify-center bg-[linear-gradient(135deg,#e8dcc3,#cbb58d)]"><span className="absolute inset-x-4 top-1/2 h-px bg-rose-800/40" /><span className="absolute left-1/2 top-3 bottom-3 w-px bg-rose-800/35" /><WaxSeal label={isCollaborative ? "Us" : isLocked ? "Lock" : "Open"} /></div>;
  return <CompactKeepsakeShell {...props} preview={preview} icon={isLocked ? <LockKeyhole className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />} label={label} excerpt={excerpt} tone="forest" />;
}


