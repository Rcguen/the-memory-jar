import type { ReactNode } from "react";

export function StaticHomeShell({ children }: { children: ReactNode }) {
  return (
    <main className="home-room relative flex min-h-[100dvh] w-full flex-col items-center justify-start pb-36 transition-colors duration-300 sm:pb-8 xl:min-h-[100dvh] xl:overflow-y-auto xl:pb-0 motion-reduce:transition-none">
      <div
        className="pointer-events-none absolute inset-0 z-0 border-x border-[var(--border-soft)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-[var(--border-soft)]"
        aria-hidden="true"
      />
      {children}
    </main>
  );
}
