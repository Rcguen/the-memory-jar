"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion, type Transition } from "framer-motion";
import {
  ArrowLeft,
  Menu,
  X,
  Heart,
  Compass,
  BookOpen,
  CalendarHeart,
  Mail,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Hũ Kỷ Niệm", icon: Heart },
  { href: "/timeline", label: "Dòng Thời Gian", icon: Compass },
  { href: "/memory-book", label: "Sách Kỷ Niệm", icon: BookOpen },
  { href: "/on-this-day", label: "Ngày Này Năm Xưa", icon: CalendarHeart },
  { href: "/animated-cards", label: "Lá Thư Tình", icon: Mail },
  { href: "/dashboard", label: "Bảng Điều Khiển", icon: LayoutDashboard },
];

export default function NotFound() {
  const [scaleY, setScaleY] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Measure text offsetHeight and dynamically compute scaleY for responsive stretch effect
  useEffect(() => {
    const handleResize = () => {
      if (textRef.current) {
        const height = textRef.current.offsetHeight || 1;
        setScaleY(window.innerHeight / height);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when drawer menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Spring transition presets (Emil Kowalski design engineering principles)
  const springTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };

  return (
    <div className="relative flex h-screen w-full select-none flex-col overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)] font-sans transition-colors duration-300">
      {/* AMBIENT JAR LIGHTING & WARM GLOW */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_65%_48%_at_50%_36%,rgba(245,230,184,0.30),transparent_72%)] [background-image:radial-gradient(ellipse_65%_48%_at_50%_36%,rgba(245,230,184,0.30),transparent_72%),linear-gradient(180deg,rgba(255,255,255,0.25)_0%,transparent_45%)] dark:[background-image:radial-gradient(ellipse_65%_48%_at_50%_36%,rgba(232,192,116,0.12),transparent_72%),linear-gradient(180deg,rgba(255,255,255,0.035)_0%,transparent_45%)]"
        aria-hidden="true"
      />

      {/* FLOATING MEMORY DUST MOTES (Cinematic micro-particles) */}
      {!shouldReduceMotion && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {[
            { top: "25%", left: "18%", size: 6, duration: 7, delay: 0 },
            { top: "45%", left: "82%", size: 8, duration: 8.5, delay: 1.2 },
            { top: "68%", left: "22%", size: 5, duration: 6.5, delay: 0.8 },
            { top: "30%", left: "75%", size: 7, duration: 9, delay: 2 },
            { top: "75%", left: "70%", size: 6, duration: 7.5, delay: 1.5 },
          ].map((mote, idx) => (
            <motion.div
              key={idx}
              className="absolute rounded-full bg-amber-400/25 blur-[1px] dark:bg-amber-300/15"
              style={{
                top: mote.top,
                left: mote.left,
                width: mote.size,
                height: mote.size,
              }}
              animate={{
                y: [-8, 8, -8],
                x: [-4, 4, -4],
                opacity: [0.3, 0.7, 0.3],
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{
                duration: mote.duration,
                repeat: Infinity,
                delay: mote.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* BACKGROUND 404 WATERMARK & OVAL SPOTLIGHT */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 95%)",
          maskImage: "linear-gradient(to bottom, black 30%, transparent 95%)",
        }}
        aria-hidden="true"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {/* Big 404 Text - Tactile embossed watermark */}
          <div
            ref={textRef}
            className="whitespace-nowrap font-black leading-none tracking-tighter text-[#4a3b2c]/[0.07] dark:text-[#f5f0e7]/[0.05]"
            style={{
              fontSize: "clamp(200px, 46vw, 780px)",
              transform: `scale(1.15, ${scaleY * 1.4})`,
              transformOrigin: "center",
            }}
          >
            404
          </div>

          {/* Oval Shape on top of 404 - Soft illuminated bell jar spotlight with subtle breathing */}
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    scale: [1, 1.015, 1],
                    opacity: [0.92, 0.98, 0.92],
                  }
            }
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute h-[24vh] rounded-full border border-[var(--divider)] bg-white/90 shadow-[0_20px_50px_-15px_rgba(215,185,140,0.35)] backdrop-blur-sm sm:h-[28vh] md:h-[48vh] dark:border-amber-400/10 dark:bg-[#201e19]/90 dark:shadow-[0_0_50px_-10px_rgba(232,192,116,0.12)]"
            style={{
              width: "clamp(130px, 21vw, 400px)",
              transform: `scaleY(${scaleY * 1.4})`,
              transformOrigin: "center",
              willChange: "transform, opacity",
            }}
          />
        </div>
      </div>

      {/* TOP NAVIGATION BAR */}
      <motion.header
        initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="relative z-20 flex flex-row items-center justify-between px-5 py-4 sm:px-8 sm:py-5 md:px-12"
      >
        {/* Logo / Brand with interactive heart */}
        <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.08 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.94 }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--surface-raised)] shadow-sm backdrop-blur-sm transition-colors group-hover:bg-[var(--surface-paper)]"
          >
            <Heart className="h-4 w-4 fill-[var(--jar-rose)] text-[var(--jar-rose)] transition-transform duration-300 group-hover:scale-110" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
              The Memory Jar
            </span>
            <span className="hidden text-[10px] font-medium tracking-wider text-[var(--text-secondary)] uppercase sm:inline-block">
              Hũ Kỷ Niệm Của Hai Ta
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Điều hướng chính">
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <motion.div
              key={item.href}
              whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -1 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
            >
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] px-4 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all hover:bg-[var(--surface-raised)] hover:shadow-md"
              >
                <item.icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Menu button */}
        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => setIsMenuOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)] px-4 py-2 text-[var(--jar-paper)] shadow-sm transition-colors hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] hover:shadow-md sm:px-5 sm:py-2.5"
          aria-label="Mở danh mục điều hướng"
        >
          <Menu className="h-4 w-4" />
          <span className="text-sm font-medium">Khám phá</span>
        </motion.button>
      </motion.header>

      {/* CENTRAL CAT ANIMATION - Gentle breathing floating motion */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={
          shouldReduceMotion
            ? { opacity: 1, scale: 1 }
            : {
                opacity: 1,
                scale: 1,
                y: [-4, 4, -4],
              }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0.2 }
            : {
                opacity: { duration: 0.7, ease: "easeOut" },
                scale: { type: "spring", stiffness: 280, damping: 24 },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="pointer-events-none absolute inset-x-0 top-[11%] flex items-center justify-center sm:top-[12%] md:top-[10%]"
        style={{ willChange: "transform" }}
        aria-hidden="true"
      >
        <div className="relative flex h-[36vh] max-h-[380px] w-[90vw] max-w-[380px] items-center justify-center sm:h-[42vh] sm:max-h-[440px] sm:w-[440px] md:h-[46vh] md:max-h-[480px] md:w-[480px]">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/cat-poster.png"
            className="pointer-events-none h-full w-full object-contain"
          >
            <source src="/cat.webm" type="video/webm" />
            <source src="/cat.mp4" type="video/mp4" />
          </video>
        </div>
      </motion.div>

      {/* BOTTOM CONTENT AREA - Staggered spring entrance */}
      <main className="relative z-30 mt-auto flex flex-col items-center px-4 pb-8 text-center sm:pb-12 md:pb-14">
        {/* Subtle Badge */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--surface-paper)]/90 px-3.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm backdrop-blur-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Kỷ niệm bị thất lạc</span>
        </motion.div>

        {/* Emotionally resonant heading */}
        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
          className="mb-2 max-w-lg font-serif text-2xl font-bold tracking-normal text-[var(--text-primary)] sm:max-w-2xl sm:text-3xl md:text-4xl"
          style={{ textWrap: "balance" }}
        >
          Trang ký ức này chưa từng{" "}
          <span className="inline-block whitespace-nowrap">được viết...</span>
        </motion.h1>

        {/* Subtitle description */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.3 }}
          className="mb-6 max-w-md text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm md:text-base"
        >
          Có vẻ như khoảnh khắc bạn tìm kiếm đã trôi ra ngoài chiếc lọ. Chú mèo gác bàn vẫn đang trông chừng những kỷ niệm đẹp nhất của hai bạn.
        </motion.p>

        {/* Primary Action Button with subtle arrow hover nudge */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springTransition, delay: 0.4 }}
          whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -1 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        >
          <Link
            href="/"
            className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)] px-7 py-3.5 text-sm font-semibold text-[var(--jar-paper)] shadow-[var(--shadow-2)] transition-colors hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] hover:shadow-lg sm:px-9 sm:py-4 sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1 sm:h-5 sm:w-5" />
            <span>Quay về Hũ Kỷ Niệm</span>
          </Link>
        </motion.div>
      </main>

      {/* MOBILE / SLIDE-OUT MENU DRAWER WITH ANIMATEPRESENCE */}
      <AnimatePresence>
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-50 pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Danh mục trang"
          >
            {/* Backdrop Fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.15 }
                  : { type: "spring", stiffness: 340, damping: 32 }
              }
              className="absolute top-0 right-0 flex h-full w-full flex-col justify-between border-l border-[var(--divider)] bg-[var(--surface-base)] shadow-2xl sm:w-[390px]"
            >
              {/* Header & Nav links container */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--divider)] p-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--surface-raised)]">
                      <Heart className="h-4 w-4 fill-[var(--jar-rose)] text-[var(--jar-rose)]" />
                    </div>
                    <span className="font-serif text-lg font-bold tracking-tight text-[var(--text-primary)]">
                      The Memory Jar
                    </span>
                  </div>

                  {/* Close Button */}
                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.08 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                    aria-label="Đóng menu"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>

                {/* Subtitle */}
                <div className="px-6 pt-5 pb-2 text-xs font-medium tracking-wide text-[var(--text-secondary)] uppercase">
                  Các góc nhỏ của hai ta:
                </div>

                {/* Menu Items with Staggered Spring Animation */}
                <nav className="mt-1 flex flex-col gap-2.5 px-6" aria-label="Danh sách điểm đến">
                  {NAV_ITEMS.map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 28,
                        delay: shouldReduceMotion ? 0 : 0.08 + i * 0.04,
                      }}
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02, x: 3 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3.5 rounded-2xl border border-[var(--divider)] bg-[var(--surface-paper)] px-5 py-3.5 text-base font-medium text-[var(--text-primary)] shadow-sm transition-all hover:bg-[var(--surface-raised)] hover:shadow-md"
                      >
                        <item.icon className="h-5 w-5 text-[var(--text-secondary)]" />
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>
              </div>

              {/* Bottom Return Button */}
              <div className="relative border-t border-[var(--divider)] p-6">
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                >
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)] py-3.5 text-base font-semibold text-[var(--jar-paper)] shadow-md transition-all hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] hover:shadow-lg"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Về lại Lọ Kỷ Niệm</span>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
