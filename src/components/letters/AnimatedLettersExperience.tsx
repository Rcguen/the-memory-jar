"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Mail, X } from "lucide-react";

type Letter = {
  id: string;
  title: string;
  recipient: string;
  date: string;
  color: string;
  accent: string;
  stamp: string;
  message: string;
  body: string[];
};

const LETTERS: Letter[] = [
  {
    id: "01",
    title: "For my sweet flower",
    recipient: "Kristine Ann Flores",
    date: "A first little chapter",
    color: "#ead7be",
    accent: "#a3654c",
    stamp: "☼",
    message: "Happy one month anniversary, my sweet flower.",
    body: [
      "Hello honey, happy one month anniversary. Thank you for every letter, every conversation, and every little moment we keep safe together.",
      "I never expected that our story would grow this beautifully. I am grateful for the warmth you bring into every ordinary day.",
      "To my flower, I love you from the deepest part of my heart. Here is to all the chapters still waiting for us.",
    ],
  },
  {
    id: "02",
    title: "Happy 2-Month Anniversary",
    recipient: "Selene",
    date: "Two months of love",
    color: "#ded0c7",
    accent: "#82665c",
    stamp: "✦",
    message: "My dearest love, with all my heart.",
    body: [
      "Happy 2-month anniversary, my love. Time moves quickly when every day has your voice, your smile, and your kindness in it.",
      "Thank you for accepting me as I am and for making even the quiet moments feel special. This is only the beginning of our story.",
    ],
  },
  {
    id: "03",
    title: "Happy 3-Month Anniversary",
    recipient: "My beautiful Kristine",
    date: "June 04, 2026",
    color: "#d4ddcf",
    accent: "#5f7c6d",
    stamp: "♡",
    message: "You are the favorite part of my everyday life.",
    body: [
      "When I look back at the last 90 days, I just smile. It is amazing how much my world has changed since you came into it.",
      "I love our long talks, our silly jokes, and the quiet moments when we simply sit beside each other. You make everything feel warm and safe.",
      "Three months down, and so many more to go. I promise to keep holding your hand and making you feel loved every day.",
    ],
  },
  {
    id: "04",
    title: "Happy 4th Monthsary",
    recipient: "Sa aking napakagandang Kristine",
    date: "July 1st, 2026",
    color: "#e9dcad",
    accent: "#96763e",
    stamp: "☆",
    message: "Ang makasama ka ay parang mahika.",
    body: [
      "Happy 4th monthsary, mahal ko. Hindi ako makapaniwala na 120 araw na ang lumipas, pero araw-araw kasama ka ay parang mahika.",
      "Ikaw ang pinakamagandang nangyari sa buhay ko. Gusto kong gumawa ng mga espesyal na bagay para sa'yo at makita ang iyong ngiti araw-araw.",
      "Ang apat na buwan ay maliit na kabanata lamang sa ating walang hanggang kwento ng pag-ibig.",
    ],
  },
  {
    id: "05",
    title: "Happy 5-Month Anniversary",
    recipient: "My beautiful HamHam",
    date: "August 3rd, 2026",
    color: "#cbd3dd",
    accent: "#5d7086",
    stamp: "∞",
    message: "With all my love, always.",
    body: [
      "Happy 5-month anniversary, my love. When work gets heavy, seeing your face or hearing your voice makes everything feel okay again.",
      "I love our simple moments most: music in the background, city lights outside, and the comfort of being inside your arms.",
      "Five months is only the start. I want to keep holding your hand through every good day and every hard one ahead.",
    ],
  },
  {
    id: "06",
    title: "Happy 6-Month Anniversary",
    recipient: "My dearest Kristine",
    date: "Half a year of us",
    color: "#dcc9bc",
    accent: "#906856",
    stamp: "☾",
    message: "Thank you for the best six months of my life.",
    body: [
      "Today is a huge milestone for us—half a year of being together. Time really does fly when I am with you.",
      "You are not just my girlfriend; you are my favorite person in the whole world. Every memory we make feels like a photograph I want to keep forever.",
      "If these first six months were this amazing, I cannot wait to see what our future holds. I love you more than words can say.",
    ],
  },
];

function getOffset(index: number, activeIndex: number, count: number) {
  let offset = index - activeIndex;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}

export function AnimatedLettersExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reading, setReading] = useState<Letter | null>(null);
  const activeLetter = LETTERS[activeIndex];

  const goTo = (nextIndex: number) => {
    setActiveIndex((nextIndex + LETTERS.length) % LETTERS.length);
  };

  const activeCountLabel = useMemo(
    () => `${String(activeIndex + 1).padStart(2, "0")} / ${String(LETTERS.length).padStart(2, "0")}`,
    [activeIndex],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReading(null);
      if (reading) return;
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
      if (event.key === "Enter") setReading(activeLetter);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, activeLetter, reading]);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0b0b0c] text-[#f8efe8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(126,84,62,0.28),transparent_34%),radial-gradient(circle_at_8%_90%,rgba(67,43,37,0.3),transparent_30%)]" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="focus-ring-premium inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs uppercase tracking-[0.16em] text-stone-300 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.09] active:scale-[0.97] motion-reduce:transition-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to jar
          </Link>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">Private correspondence</p>
            <p className="mt-1 font-serif text-sm text-stone-300">Letters in motion</p>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center pb-10 pt-8 sm:pb-16">
          <div className="mb-8 max-w-xl text-center sm:mb-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c0927b]">A small archive of us</p>
            <h1 className="mt-4 font-serif text-5xl font-normal leading-[0.92] tracking-[-0.04em] text-stone-100 sm:text-7xl">
              Letters
              <br />
              <em className="text-[#c0927b]">in motion</em>
            </h1>
            <p className="mt-5 text-sm leading-6 text-stone-400">Choose a letter, then open it when you are ready.</p>
          </div>

          <div className="relative h-[19rem] w-full max-w-3xl [perspective:1200px] sm:h-[25rem]">
            {LETTERS.map((letter, index) => {
              const offset = getOffset(index, activeIndex, LETTERS.length);
              const distance = Math.abs(offset);
              const isActive = offset === 0;
              const visible = distance <= 2;
              const transform = `translate(-50%, -50%) translateX(${offset * 28}%) translateZ(${-distance * 110}px) rotateY(${offset * -15}deg) rotateZ(${offset * 2}deg) scale(${1 - distance * 0.09})`;

              return (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => (isActive ? setReading(letter) : goTo(index))}
                  aria-label={isActive ? `Open ${letter.title}` : `Choose ${letter.title}`}
                  tabIndex={visible ? 0 : -1}
                  className="absolute left-1/2 top-1/2 aspect-[1.58] w-[min(78vw,27rem)] origin-center rounded-[0.65rem] text-left outline-none transition-[transform,opacity,filter] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#f0c7a5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0c] motion-reduce:transition-none"
                  style={{
                    transform,
                    opacity: visible ? (isActive ? 1 : 0.58) : 0,
                    filter: isActive ? "none" : "blur(1px)",
                    zIndex: 10 - distance,
                    pointerEvents: visible ? "auto" : "none",
                  }}
                >
                  <div className="absolute inset-[-2px] rounded-[0.7rem] border border-white/10 bg-[#634b3e] shadow-[0_28px_60px_rgba(0,0,0,0.5)]" />
                  <div className="absolute inset-0 overflow-hidden rounded-[0.6rem] border border-black/10" style={{ backgroundColor: letter.color }}>
                    <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_12%_18%,rgba(255,255,255,.52),transparent_27%),repeating-linear-gradient(0deg,rgba(115,88,66,.05)_0_1px,transparent_1px_4px)]" />
                    <div className="absolute inset-0 z-[1] [clip-path:polygon(0_0,50%_57%,0_100%)] bg-black/[0.08]" />
                    <div className="absolute inset-0 z-[1] [clip-path:polygon(100%_0,50%_57%,100%_100%)] bg-white/[0.18]" />
                    <div className="absolute inset-0 z-[2] bottom-[46%] [clip-path:polygon(0_0,100%_0,50%_100%)] bg-white/[0.28]" />
                    <div
                      className="absolute left-1/2 top-[52%] z-[4] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#fff1d2]/80 text-2xl text-[#fff1d2] shadow-[0_4px_8px_rgba(48,25,17,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]"
                      style={{ backgroundColor: `${letter.accent}cc` }}
                    >
                      {letter.stamp}
                    </div>
                    <div className="absolute bottom-5 left-5 right-6 z-[4] text-[#503a30]">
                      <span className="block font-sans text-[10px] font-semibold uppercase tracking-[0.08em]">To {letter.recipient}</span>
                      <strong className="mt-1 block truncate font-serif text-lg font-normal sm:text-xl">{letter.title}</strong>
                    </div>
                    <div className="absolute bottom-2 left-5 z-[4] rounded-sm bg-black/45 px-1.5 py-1 font-mono text-[9px] tracking-[0.14em] text-white/90">
                      LETTER {letter.id}
                    </div>
                    <div className="absolute right-4 top-4 z-[4] grid h-11 w-9 rotate-3 place-items-center border border-black/20 bg-[#f7efdb] text-lg shadow-sm" style={{ color: letter.accent }}>
                      {letter.stamp}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-5 sm:mt-8">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous letter"
              className="focus-ring-premium grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.1] active:scale-[0.97] motion-reduce:transition-none"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="font-mono text-[10px] tracking-[0.2em] text-stone-500">{activeCountLabel}</span>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next letter"
              className="focus-ring-premium grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.1] active:scale-[0.97] motion-reduce:transition-none"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Click the centered envelope to read</p>
        </section>
      </div>

      {reading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-md" role="presentation" onClick={() => setReading(null)}>
          <article
            className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto border border-[#a3654c]/30 bg-[#fff9ed] px-7 py-10 text-[#503b35] shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:px-14 sm:py-14"
            onClick={(event) => event.stopPropagation()}
            style={{ ["--letter-accent" as string]: reading.accent }}
          >
            <button type="button" onClick={() => setReading(null)} aria-label="Close letter" className="focus-ring-premium absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-[#9a7c70] transition-colors hover:bg-black/5">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--letter-accent)] text-2xl" style={{ color: reading.accent }}>{reading.stamp}</div>
            <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: reading.accent }}>{reading.date} · {reading.id}</p>
            <h2 className="mx-auto mt-4 max-w-xl text-center font-serif text-4xl font-normal leading-none sm:text-5xl">{reading.title}</h2>
            <div className="mx-auto my-7 h-px w-20" style={{ backgroundColor: reading.accent }} />
            <div className="mx-auto max-w-xl space-y-5 font-serif text-lg leading-8 text-[#654d44]">
              {reading.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <p className="mt-8 text-right font-mono text-xs" style={{ color: reading.accent }}>With love,<br /><span className="font-serif text-3xl">Phú</span></p>
          </article>
        </div>
      )}
    </main>
  );
}
