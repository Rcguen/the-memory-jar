"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Compass, Heart, LayoutDashboard, BookOpen, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);
import { useMemoryModal } from "@/providers/memory-modal-provider";
import { useHaptics } from "@/hooks/useHaptics";
import { useIsPhone } from "@/hooks/useIsPhone";
import { useIntentRoutePrefetch } from "@/hooks/useRoutePrefetch";

const ITEMS = [
  { href: "/", label: "Jar", icon: Heart, accent: "text-rose-300" },
  { href: "/timeline", label: "Timeline", icon: Compass, accent: "text-emerald-300" },
  { href: "/memory-book", label: "Book", icon: BookOpen, accent: "text-amber-300" },
  { href: "/on-this-day", label: "On This Day", icon: CalendarHeart, accent: "text-purple-300" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "text-sky-300" },
  { href: "/animated-cards", label: "Letters", icon: Mail, accent: "text-violet-300" },
] as const;

export function MobileBottomNav({ memoryShelfOpen = false }: { memoryShelfOpen?: boolean }) {
  const pathname = usePathname();
  const { openModal } = useMemoryModal();
  const { trigger } = useHaptics();
  const isPhone = useIsPhone();
  const prefetchRoute = useIntentRoutePrefetch();

  if (!isPhone) return null;

  return (
    <>
      <div className={cn("pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[85] flex px-4 sm:hidden", memoryShelfOpen ? "justify-end pr-5" : "justify-center")}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          onClick={() => {
            trigger("light");
            openModal();
          }}
          className={cn(
            "pointer-events-auto relative inline-flex items-center border border-[var(--divider)] bg-[var(--surface-wood)] text-left text-[var(--jar-paper)] shadow-[var(--shadow-2)] transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] focus-ring-premium",
            memoryShelfOpen ? "h-12 w-12 justify-center rounded-full p-1.5" : "min-h-12 gap-2 rounded-[var(--radius-small)] px-4 py-2.5",
          )}
          aria-label="Drop a Memory"
          title="Drop a Memory"
        >
          <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-tiny)] border border-white/15 bg-white/10", memoryShelfOpen && "rounded-full")}>
            <Heart className="h-4.5 w-4.5 fill-[var(--jar-paper)] text-[var(--jar-paper)]" />
          </span>
          <span className={cn("relative flex flex-col leading-none", memoryShelfOpen && "sr-only")}>
            <span className="font-cormorant text-lg">Drop a Memory</span>
            <span className="text-[11px] text-white/65">Keep this moment</span>
          </span>
        </motion.button>
      </div>

      <nav aria-label="Primary navigation" className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[80] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 sm:hidden flex justify-center">
        <div className="w-full max-w-md rounded-[var(--radius-medium)] border border-[var(--divider)] bg-[var(--surface-wood)] p-1.5 shadow-[var(--shadow-3)]">
          <div className="grid grid-cols-6 gap-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <MotionLink
                key={item.href}
                href={item.href}
                prefetch={false}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                onPointerDown={() => {
                  if (!active) prefetchRoute(item.href);
                }}
                onFocus={() => {
                  if (!active) prefetchRoute(item.href);
                }}
                onClick={() => trigger("light")}
                className={cn(
                  "flex min-h-[50px] flex-col items-center justify-center rounded-[0.9rem] px-1 py-1.5 text-center transition-[transform,background-color,color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] focus-ring-premium motion-reduce:transform-none motion-reduce:transition-none",
                  active ? "bg-white/12 text-[var(--jar-paper)]" : "text-white/60 hover:bg-white/6 hover:text-[var(--jar-paper)] active:scale-[0.97]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-4.5 w-4.5", active ? item.accent : "text-[var(--text-secondary)]")} />
                <span className="mt-1 text-[9px] font-medium tracking-[0.01em]">{item.label}</span>
              </MotionLink>
            );
          })}
          </div>
        </div>
      </nav>
    </>
  );
}
