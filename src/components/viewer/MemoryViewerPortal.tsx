"use client";

import dynamic from "next/dynamic";

const MemoryViewer = dynamic(
  () => import("./MemoryViewer").then((mod) => mod.MemoryViewer),
  { ssr: false }
);

export function MemoryViewerPortal() {
  return <MemoryViewer />;
}
