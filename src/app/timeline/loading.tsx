function TimelineLoadingCard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/50 p-4 backdrop-blur-xl dark:bg-zinc-950/40 sm:p-5">
      <div className="mb-4 h-4 w-28 rounded-full bg-zinc-300/30 dark:bg-zinc-700/40" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.2rem] border border-white/10 bg-white/70 px-4 py-4 dark:bg-zinc-950/50"
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
    <main className="relative min-h-screen overflow-hidden bg-emerald-50/30 px-4 py-8 dark:bg-emerald-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_40%)]" />
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="h-5 w-28 rounded-full bg-zinc-400/25 dark:bg-zinc-700/40" />

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/15 bg-zinc-950/55 px-6 py-7 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-8">
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
          <div className="inline-flex rounded-full border border-white/12 bg-zinc-950/65 px-4 py-2 font-cormorant text-2xl text-zinc-50 shadow-lg backdrop-blur-xl">
            2026
          </div>
          <TimelineLoadingCard />
          <TimelineLoadingCard />
        </section>
      </div>
    </main>
  );
}
