import { MemoryBookClient } from "@/components/storybook/MemoryBookClient";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { AmbientParticles } from "@/components/ui/AmbientParticles";

export const metadata = {
  title: "Memory Book - The Memory Jar",
  description: "Your relationship storybook.",
};

export default function MemoryBookPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 relative overflow-hidden pb-32 sm:pb-0">
      <AmbientParticles />
      <MemoryBookClient />
      <MobileBottomNav />
    </main>
  );
}
