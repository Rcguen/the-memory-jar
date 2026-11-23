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
    <div
      className="relative flex h-screen w-full select-none flex-col overflow-hidden font-sans"
      style={{
        background: "linear-gradient(180deg, #cf6b2e 0%, #e89552 50%, #f6b173 100%)",
      }}
    >
      {/* BACKGROUND 404 TEXT & OVAL EFFECT */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{
          opacity: 0.85,
          WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 95%)",
          maskImage: "linear-gradient(to bottom, black 35%, transparent 95%)",
        }}
        aria-hidden="true"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {/* Big 404 Text */}
          <div
            ref={textRef}
            className="whitespace-nowrap font-black leading-none tracking-tighter text-white"
            style={{
              fontSize: "clamp(200px, 48vw, 820px)",
              transform: `scale(1.15, ${scaleY * 1.4})`,
              transformOrigin: "center",
            }}
          >
            404
          </div>

          {/* Oval Shape on top of 404 */}
          <div
            className="absolute h-[22vh] rounded-full bg-white sm:h-[26vh] md:h-[50vh]"
            style={{
              width: "clamp(120px, 20vw, 420px)",
              transform: `scaleY(${scaleY * 1.4})`,
              transformOrigin: "center",
            }}
          />
        </div>
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="relative z-20 flex flex-row items-center justify-between px-5 py-4 sm:px-8 sm:py-6 md:px-12">
        {/* Logo / Brand */}
        <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 shadow-sm backdrop-blur-sm transition-colors group-hover:bg-white/30">
            <Heart className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-white sm:text-xl">
              The Memory Jar
            </span>
            <span className="hidden text-[10px] tracking-wider text-white/80 uppercase sm:inline-block">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-[#cf6b2e] shadow-sm transition-all hover:bg-white hover:shadow-md hover:scale-105"
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Menu button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-[#ba581e] px-4 py-2 text-white shadow-sm transition-all hover:bg-[#a94f19] hover:shadow-md active:scale-95 sm:px-5 sm:py-2.5"
          aria-label="Mở danh mục điều hướng"
        >
          <Menu className="h-4 w-4" />
          <span className="text-sm font-medium">Khám phá</span>
        </button>
      </header>

      {/* CENTRAL CAT ANIMATION */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ marginTop: "calc(-5vh - 30px)" }}
        aria-hidden="true"
      >
        <div className="flex h-[85vh] w-[120vw] items-center justify-center sm:h-[70vh] sm:w-[70vw] md:h-[76vh] md:w-[60vw]">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/cat-poster.jpg"
            className="pointer-events-none h-full w-full object-contain mix-blend-darken"
            src="/cat.mp4"
          />
        </div>
      </div>

      {/* BOTTOM CONTENT AREA */}
      <main className="relative z-30 mt-auto flex flex-col items-center px-4 pb-10 text-center sm:pb-16">
        {/* Literary Tagline */}
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 fill-white text-white" />
          <span>Kỷ niệm bị thất lạc</span>
        </div>

        {/* Emotionally resonant heading */}
        <h1 className="mb-2 max-w-md font-serif text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:max-w-xl sm:text-3xl md:text-4xl">
          Trang ký ức này chưa từng được viết...
        </h1>

        <p className="mb-6 max-w-md text-sm text-white/90 sm:text-base">
          Có vẻ như khoảnh khắc bạn tìm kiếm đã trôi ra ngoài chiếc lọ. Chú mèo gác bàn vẫn đang trông chừng những kỷ niệm đẹp nhất của hai bạn.
        </p>

        {/* Primary Action Button */}
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#ba581e] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#a94f19] hover:shadow-xl active:scale-95 sm:px-9 sm:py-4 sm:text-base"
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
          className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />

        {/* Sliding Panel */}
        <div
          className={`absolute top-0 right-0 flex h-full w-full flex-col justify-between shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[390px] ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            background: "linear-gradient(135deg, #d36928 0%, #eb934e 100%)",
          }}
        >
          {/* Header & Nav links container */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Heart className="h-4 w-4 fill-white text-white" />
                </div>
                <span className="font-serif text-lg font-bold tracking-tight text-white">
                  The Memory Jar
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Subtitle */}
            <div className="px-6 pb-2 text-xs text-white/80">
              Chọn một góc nhỏ để ghé thăm:
            </div>

            {/* Menu Items with Staggered Animation */}
            <nav className="mt-1 flex flex-col gap-2.5 px-6" aria-label="Danh sách điểm đến">
              {NAV_ITEMS.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3.5 rounded-2xl bg-white/10 px-5 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-white/25 active:scale-98 ${
                    isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
                  style={{
                    transitionDelay: isMenuOpen ? `${120 + i * 50}ms` : "0ms",
                  }}
                >
                  <item.icon className="h-5 w-5 text-white/90" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom Return Button */}
          <div className="relative p-6">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white py-3.5 text-base font-semibold text-[#cf6b2e] shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white/95 active:scale-98 ${
                isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{
                transitionDelay: isMenuOpen ? "450ms" : "0ms",
              }}
            >
              <ArrowLeft className="h-4 w-4 text-[#cf6b2e]" />
              <span>Về lại Lọ Kỷ Niệm</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
