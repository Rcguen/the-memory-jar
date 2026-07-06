"use client";

import dynamic from "next/dynamic";

const MemoryModal = dynamic(
  () => import("./MemoryModal").then((mod) => mod.MemoryModal),
  { ssr: false },
);

export function MemoryModalPortal() {
  return <MemoryModal />;
}
