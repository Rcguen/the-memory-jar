import { MemoryBookClient } from "@/components/storybook/MemoryBookClient";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { AmbientParticles } from "@/components/ui/AmbientParticles";

export const metadata = {
  title: "Memory Book - The Memory Jar",
  description: "Your relationship storybook.",
};

export default function MemoryBookPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--surface-base)] pb-32 sm:pb-0">
      <AmbientParticles />
      <MemoryBookClient />
      <MobileBottomNav />
    </main>
  );
}
