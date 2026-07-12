import { HeartCrack } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 p-6 text-center">
      <div className="rounded-full border border-white/5 bg-white/[0.02] p-5 mb-6">
        <HeartCrack className="h-12 w-12 text-zinc-500" />
      </div>
      <h1 className="font-cormorant text-4xl text-zinc-50 sm:text-5xl">You&apos;re offline.</h1>
      <p className="mt-4 max-w-md text-zinc-400">
        The Memory Jar is resting while your connection is unavailable. Your private memories are safe, but we need the internet to securely unlock them.
      </p>
      <Link href="/" className="mt-8 inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-100 ring-offset-background transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
        Try Again
      </Link>
    </main>
  );
}
