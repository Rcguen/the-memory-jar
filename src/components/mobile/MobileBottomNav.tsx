"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Compass, Heart, LayoutDashboard, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { useHaptics } from "@/hooks/useHaptics";
import { useIsPhone } from "@/hooks/useIsPhone";

const ITEMS = [
  { href: "/", label: "Jar", icon: Heart, accent: "text-rose-300" },
  { href: "/timeline", label: "Timeline", icon: Compass, accent: "text-emerald-300" },
  { href: "/memory-book", label: "Book", icon: BookOpen, accent: "text-amber-300" },
  { href: "/on-this-day", label: "On This Day", icon: CalendarHeart, accent: "text-purple-300" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "text-sky-300" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { openModal } = useMemoryModal();
  const { trigger } = useHaptics();
  const isPhone = useIsPhone();

  if (!isPhone) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.15rem)] z-[85] flex justify-center px-4 sm:hidden">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          onClick={() => {
            trigger("light");
            openModal();
          }}
          className="pointer-events-auto relative inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.96),rgba(5,150,105,0.92))] px-4 py-2.5 text-left text-white shadow-[0_16px_48px_rgba(5,150,105,0.35)] backdrop-blur-xl transition-colors focus-ring-premium"
          aria-label="Drop a Memory"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),transparent_48%)]" />
          <span className="pointer-events-none absolute -inset-3 rounded-full bg-emerald-400/30 blur-2xl" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <Heart className="h-4.5 w-4.5 fill-white text-white" />
          </span>
          <span className="relative flex flex-col leading-none">
            <span className="font-cormorant text-lg">Drop a Memory</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-50/75">Keep this moment</span>
          </span>
        </motion.button>
      </div>

      <nav aria-label="Primary navigation" className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--divider)] bg-[var(--surface-wood)]/85 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2.5 shadow-[var(--shadow-modal)] backdrop-blur-2xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.45rem] border border-[var(--divider)] bg-[var(--surface-raised)]/5 p-1.5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <MotionLink
                key={item.href}
                href={item.href}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                onClick={() => trigger("light")}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center rounded-[1.1rem] px-1 py-2 text-center transition-colors focus-ring-premium",
                  active ? "bg-white/10 text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-4.5 w-4.5", active ? item.accent : "text-[var(--text-secondary)]")} />
                <span className="mt-1 text-[10px] font-medium tracking-[0.01em]">{item.label}</span>
              </MotionLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
