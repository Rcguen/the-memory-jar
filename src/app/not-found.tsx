"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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

  return (
    <div className="relative flex h-screen w-full select-none flex-col overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)] font-sans transition-colors duration-300">
      {/* AMBIENT JAR LIGHTING & WARM GLOW */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 48% at 50% 36%, rgba(245, 230, 184, 0.32), transparent 72%), linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, transparent 45%)",
        }}
        aria-hidden="true"
      />

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

          {/* Oval Shape on top of 404 - Soft illuminated bell jar spotlight */}
          <div
            className="absolute h-[24vh] rounded-full border border-[var(--divider)] bg-white/90 shadow-[0_20px_50px_-15px_rgba(215,185,140,0.35)] backdrop-blur-sm sm:h-[28vh] md:h-[48vh] dark:bg-[#201e19]/90 dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]"
            style={{
              width: "clamp(130px, 21vw, 400px)",
              transform: `scaleY(${scaleY * 1.4})`,
              transformOrigin: "center",
            }}
          />
        </div>
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="relative z-20 flex flex-row items-center justify-between px-5 py-4 sm:px-8 sm:py-5 md:px-12">
        {/* Logo / Brand */}
        <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--surface-raised)] shadow-sm backdrop-blur-sm transition-colors group-hover:bg-[var(--surface-paper)]">
            <Heart className="h-4 w-4 fill-[var(--jar-rose)] text-[var(--jar-rose)] transition-transform group-hover:scale-110" />
          </div>
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
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] px-4 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all hover:bg-[var(--surface-raised)] hover:shadow-md hover:scale-105 active:scale-95"
            >
              <item.icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Menu button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)] px-4 py-2 text-[var(--jar-paper)] shadow-sm transition-all hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] hover:shadow-md active:scale-95 sm:px-5 sm:py-2.5"
          aria-label="Mở danh mục điều hướng"
        >
          <Menu className="h-4 w-4" />
          <span className="text-sm font-medium">Khám phá</span>
        </button>
      </header>

      {/* CENTRAL CAT ANIMATION - Properly sized & positioned so it does not overlap text */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[11%] flex items-center justify-center sm:top-[12%] md:top-[10%]"
        aria-hidden="true"
      >
        <div className="relative flex h-[36vh] max-h-[380px] w-[90vw] max-w-[380px] items-center justify-center sm:h-[42vh] sm:max-h-[440px] sm:w-[440px] md:h-[46vh] md:max-h-[480px] md:w-[480px]">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/cat-poster.jpg"
            className="pointer-events-none h-full w-full object-contain mix-blend-darken dark:mix-blend-normal"
            src="/cat.mp4"
          />
        </div>
      </div>

      {/* BOTTOM CONTENT AREA - Clean separation below cat animation */}
      <main className="relative z-30 mt-auto flex flex-col items-center px-4 pb-8 text-center sm:pb-12 md:pb-14">
        {/* Subtle Badge */}
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--surface-paper)]/90 px-3.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Kỷ niệm bị thất lạc</span>
        </div>

        {/* Emotionally resonant heading */}
        <h1 className="mb-2 max-w-md font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:max-w-xl sm:text-3xl md:text-4xl">
          Trang ký ức này chưa từng được viết...
        </h1>

        <p className="mb-6 max-w-md text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm md:text-base">
          Có vẻ như khoảnh khắc bạn tìm kiếm đã trôi ra ngoài chiếc lọ. Chú mèo gác bàn vẫn đang trông chừng những kỷ niệm đẹp nhất của hai bạn.
        </p>

        {/* Primary Action Button */}
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)] px-7 py-3.5 text-sm font-semibold text-[var(--jar-paper)] shadow-[var(--shadow-2)] transition-all hover:scale-105 hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] hover:shadow-lg active:scale-95 sm:px-9 sm:py-4 sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Quay về Hũ Kỷ Niệm</span>
        </Link>
      </main>

      {/* MOBILE / SLIDE-OUT MENU DRAWER */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMenuOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Danh mục trang"
      >
        {/* Backdrop */}
        <div
          onClick={() => setIsMenuOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />

        {/* Sliding Panel */}
        <div
          className={`absolute top-0 right-0 flex h-full w-full flex-col justify-between border-l border-[var(--divider)] bg-[var(--surface-base)] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[390px] ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
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
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Subtitle */}
            <div className="px-6 pt-5 pb-2 text-xs font-medium tracking-wide text-[var(--text-secondary)] uppercase">
              Các góc nhỏ của hai ta:
            </div>

            {/* Menu Items with Staggered Animation */}
            <nav className="mt-1 flex flex-col gap-2.5 px-6" aria-label="Danh sách điểm đến">
              {NAV_ITEMS.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3.5 rounded-2xl border border-[var(--divider)] bg-[var(--surface-paper)] px-5 py-3.5 text-base font-medium text-[var(--text-primary)] shadow-sm transition-all duration-300 hover:bg-[var(--surface-raised)] hover:shadow-md active:scale-98 ${
                    isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
                  style={{
                    transitionDelay: isMenuOpen ? `${100 + i * 40}ms` : "0ms",
                  }}
                >
                  <item.icon className="h-5 w-5 text-[var(--text-secondary)]" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom Return Button */}
          <div className="relative border-t border-[var(--divider)] p-6">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)] py-3.5 text-base font-semibold text-[var(--jar-paper)] shadow-md transition-all duration-300 hover:bg-[color-mix(in_srgb,var(--surface-wood)_88%,white)] hover:shadow-lg active:scale-98 ${
                isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{
                transitionDelay: isMenuOpen ? "400ms" : "0ms",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Về lại Lọ Kỷ Niệm</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
