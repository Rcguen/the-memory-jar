function DashboardMetricSkeleton() {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/55 p-5 shadow-lg backdrop-blur-xl dark:bg-zinc-950/35">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
        <div className="h-8 w-8 rounded-full bg-rose-400/10" />
      </div>
      <div className="mt-4 h-10 w-20 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
      <div className="mt-2 h-4 w-16 rounded-full bg-zinc-300/20 dark:bg-zinc-700/30" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-emerald-50/30 px-4 py-8 dark:bg-emerald-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,114,182,0.14),transparent_48%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_42%)]" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="h-5 w-28 rounded-full bg-zinc-400/25 dark:bg-zinc-700/40" />

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/15 bg-zinc-950/55 px-6 py-7 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-8">
          <div className="h-6 w-36 rounded-full bg-rose-200/15" />
          <div className="mt-4 h-12 w-80 max-w-full rounded-full bg-white/10" />
          <div className="mt-4 h-4 w-full max-w-3xl rounded-full bg-white/10" />
          <div className="mt-2 h-4 w-4/5 max-w-2xl rounded-full bg-white/8" />
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <DashboardMetricSkeleton key={index} />
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.5rem] border border-white/12 bg-white/55 p-5 shadow-lg backdrop-blur-xl dark:bg-zinc-950/35"
            >
              <div className="h-3 w-24 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 2 }).map((__, innerIndex) => (
                  <div
                    key={innerIndex}
                    className="rounded-[1.2rem] border border-white/10 bg-white/70 px-4 py-4 dark:bg-zinc-950/45"
                  >
                    <div className="h-3 w-24 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
                    <div className="mt-3 h-8 w-2/3 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
