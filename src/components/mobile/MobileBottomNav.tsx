"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, CalendarHeart, Compass, Heart, LayoutDashboard, BookOpen, Mail } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);
import { useHaptics } from "@/hooks/useHaptics";
import { useIsPhone } from "@/hooks/useIsPhone";
import { GooeyMobileFab460 } from "./GooeyMobileFab460";

const ITEMS = [
  { href: "/", label: "Jar", icon: Heart, accent: "text-rose-300" },
  { href: "/timeline", label: "Timeline", icon: Compass, accent: "text-emerald-300" },
  { href: "/memory-book", label: "Book", icon: BookOpen, accent: "text-amber-300" },
  { href: "/on-this-day", label: "On This Day", icon: CalendarHeart, accent: "text-purple-300" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "text-sky-300" },
  { href: "/animated-cards", label: "Letters", icon: Mail, accent: "text-violet-300" },
] as const;

export function MobileBottomNav(_props: { memoryShelfOpen?: boolean }) {
  const pathname = usePathname();
  const { trigger } = useHaptics();
  const isPhone = useIsPhone();
  const shouldReduceMotion = useReducedMotion();

  if (!isPhone) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[85] flex justify-center px-4 sm:hidden">
        <GooeyMobileFab460 />
      </div>

      <nav aria-label="Primary navigation" className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[80] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 sm:hidden flex justify-center">
        <div className="w-full max-w-md rounded-[var(--radius-medium)] border border-[var(--divider)] bg-[var(--surface-wood)] p-1.5 shadow-[var(--shadow-3)]">
          <div className="grid grid-cols-7 gap-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <MotionLink
                key={item.href}
                href={item.href}
                whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                onClick={() => trigger("light")}
                className={cn(
                  "relative flex min-h-[50px] flex-col items-center justify-center rounded-[0.9rem] px-1 py-1.5 text-center transition-colors duration-150 focus-ring-premium",
                  active ? "text-[var(--jar-paper)]" : "text-white/60 hover:bg-white/6 hover:text-[var(--jar-paper)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && !shouldReduceMotion && (
                  <motion.div
                    layoutId="mobileNavActivePill"
                    transition={{ type: "spring", stiffness: 480, damping: 32 }}
                    className="absolute inset-0 rounded-[0.9rem] bg-white/12 shadow-sm"
                  />
                )}
                {active && shouldReduceMotion && (
                  <div className="absolute inset-0 rounded-[0.9rem] bg-white/12 shadow-sm" />
                )}
                <Icon className={cn("relative z-10 h-4.5 w-4.5", active ? item.accent : "text-[var(--text-secondary)]")} />
                <span className="relative z-10 mt-1 text-[9px] font-medium tracking-[0.01em]">{item.label}</span>
              </MotionLink>
            );
          })}
          <motion.a
            href="https://photobooth-nine-lyart.vercel.app/"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => trigger("light")}
            className="flex min-h-[50px] flex-col items-center justify-center rounded-[0.9rem] px-1 py-1.5 text-center text-white/60 transition-[transform,background-color,color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/6 hover:text-[var(--jar-paper)] focus-ring-premium motion-reduce:transform-none motion-reduce:transition-none"
            aria-label="Open Photobooth"
          >
            <Camera className="h-4.5 w-4.5 text-sky-300" aria-hidden="true" />
            <span className="mt-1 text-[9px] font-medium tracking-[0.01em]">Photo</span>
          </motion.a>
          </div>
        </div>
      </nav>
    </>
  );
}
