import type { ReactNode } from "react";

export function StaticHomeShell({ children }: { children: ReactNode }) {
  return (
    <main className="home-room relative flex min-h-screen w-full flex-col items-center justify-start pb-36 transition-colors duration-700 sm:pb-8 xl:h-[100dvh] xl:justify-center xl:overflow-hidden xl:pb-0">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-100/40 via-emerald-50/20 to-transparent dark:from-teal-900/20 dark:via-emerald-950/30 dark:to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 bg-gradient-to-b from-white/20 to-transparent blur-2xl dark:from-white/5 dark:to-transparent"
        aria-hidden="true"
      />
      {children}
    </main>
  );
}