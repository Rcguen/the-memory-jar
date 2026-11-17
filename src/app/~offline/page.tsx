import { HeartCrack } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--surface-base)] p-6 text-center overflow-hidden">
      
      {/* Lightweight, CSS-only ambient breathing glow */}
      <div className="surface-paper relative z-10 mb-6 rounded-full border p-5">
        <HeartCrack className="h-12 w-12 text-[var(--text-muted)]" />
      </div>
      <h1 className="relative z-10 font-cormorant text-4xl text-[var(--text-strong)] sm:text-5xl">You&apos;re offline</h1>
      <p className="relative z-10 mt-4 max-w-md text-[var(--text-muted)]">
        The Memory Jar is resting while your connection is unavailable. Your private memories are safe, but we need the internet to securely unlock them.
      </p>
      <Link href="/" className="surface-ink relative z-10 mt-8 inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium ring-offset-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-rose)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
        Try Again
      </Link>
    </main>
  );
}
