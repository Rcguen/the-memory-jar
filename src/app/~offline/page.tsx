import { HeartCrack } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 p-6 text-center overflow-hidden">
      
      {/* Lightweight, CSS-only ambient breathing glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[120vw] h-[120vw] max-w-[800px] max-h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.03),transparent_70%)] animate-[pulse_6s_ease-in-out_infinite] motion-reduce:animate-none" />
      </div>

      <div className="relative z-10 rounded-full border border-white/5 bg-white/[0.02] p-5 mb-6 shadow-[0_0_40px_rgba(244,63,94,0.05)]">
        <HeartCrack className="h-12 w-12 text-zinc-500 opacity-80" />
      </div>
      <h1 className="relative z-10 font-cormorant text-4xl text-zinc-50 sm:text-5xl">You&apos;re offline.</h1>
      <p className="relative z-10 mt-4 max-w-md text-zinc-400">
        The Memory Jar is resting while your connection is unavailable. Your private memories are safe, but we need the internet to securely unlock them.
      </p>
      <Link href="/" className="relative z-10 mt-8 inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-100 ring-offset-background transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
        Try Again
      </Link>
    </main>
  );
}
