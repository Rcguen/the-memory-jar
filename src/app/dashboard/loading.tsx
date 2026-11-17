function DashboardMetricSkeleton() {
  return (
    <div className="surface-panel rounded-2xl p-5">
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
    <main className="relative min-h-screen overflow-hidden bg-[var(--surface-base)] px-4 py-8">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="h-5 w-28 rounded-full bg-zinc-400/25 dark:bg-zinc-700/40" />

        <section className="surface-ink mt-6 overflow-hidden rounded-2xl px-6 py-7 sm:px-8">
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
              className="surface-panel rounded-2xl p-5"
            >
              <div className="h-3 w-24 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 2 }).map((__, innerIndex) => (
                  <div
                    key={innerIndex}
                    className="surface-paper rounded-xl border px-4 py-4"
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
