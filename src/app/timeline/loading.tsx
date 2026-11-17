function TimelineLoadingCard() {
  return (
    <div className="surface-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-4 h-4 w-28 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="surface-paper rounded-xl border px-4 py-4"
          >
            <div className="h-3 w-24 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
            <div className="mt-3 h-8 w-2/3 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
            <div className="mt-3 h-4 w-full rounded-full bg-zinc-300/20 dark:bg-zinc-700/30" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-zinc-300/20 dark:bg-zinc-700/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--surface-base)] px-4 py-8">
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="h-5 w-28 rounded-full bg-zinc-400/25 dark:bg-zinc-700/40" />

        <section className="surface-ink mt-6 overflow-hidden rounded-2xl px-6 py-7 sm:px-8">
          <div className="h-6 w-24 rounded-full bg-emerald-200/15" />
          <div className="mt-4 h-12 w-72 max-w-full rounded-full bg-white/10" />
          <div className="mt-4 h-4 w-full max-w-3xl rounded-full bg-white/10" />
          <div className="mt-2 h-4 w-4/5 max-w-2xl rounded-full bg-white/8" />
          <div className="mt-5 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-8 w-24 shrink-0 rounded-full bg-white/10" />
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-8">
          <div className="surface-paper inline-flex rounded-full border px-4 py-2 font-cormorant text-2xl text-[var(--text-strong)]">
            2026
          </div>
          <TimelineLoadingCard />
          <TimelineLoadingCard />
        </section>
      </div>
    </main>
  );
}
