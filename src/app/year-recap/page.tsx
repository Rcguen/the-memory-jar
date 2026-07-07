import { YearRecapClient } from "@/components/storybook/YearRecapClient";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

export const metadata = {
  title: "Year Recap - The Memory Jar",
  description: "A beautiful summary of your year together.",
};

export default function YearRecapPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950">
      <YearRecapClient />
      <MobileBottomNav />
    </main>
  );
}
