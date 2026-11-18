"use client";

import { ReactNode } from "react";

export function LivingMemoryShelf({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative flex flex-col ${className || ""}`}>
      <div className="relative z-10 flex flex-col flex-1 min-h-0 rounded-3xl">
        {children}
      </div>
    </div>
  );
}
