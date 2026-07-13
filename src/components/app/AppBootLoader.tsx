"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_VISIBLE_MS = 900;
const NORMAL_READY_TIMEOUT_MS = 2200;
const EMERGENCY_TIMEOUT_MS = 4000;
const COMPLETE_DURATION_MS = 260;
const COMPLETE_HOLD_MS = 140;

type BodySnapshot = Pick<CSSStyleDeclaration, "overflow" | "position" | "top" | "width">;

function waitForFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function waitForFonts() {
  if (!("fonts" in document)) return Promise.resolve();

  return document.fonts.ready.catch(() => undefined);
}

function waitForJarImage() {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = "/Jar-Background-PNG.png";

    if (image.complete) resolve();
  });
}

/**
 * Launch-only visual transition. It never waits for private application data,
 * keeping auth, realtime, and route navigation independent from the overlay.
 */
export function AppBootLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const initialPathnameRef = useRef(pathname);
  const reduceMotionRef = useRef(false);
  const readyAtRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const progressAtReadyRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const emergencyTimerRef = useRef<number | null>(null);
  const bodySnapshotRef = useRef<BodySnapshot | null>(null);
  const scrollYRef = useRef(0);
  const restoreBodyRef = useRef<(() => void) | null>(null);

  const restoreBody = useCallback(() => {
    const snapshot = bodySnapshotRef.current;
    if (!snapshot) return;

    Object.assign(document.body.style, snapshot);
    window.scrollTo(0, scrollYRef.current);
    bodySnapshotRef.current = null;
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reduceMotionRef.current = query.matches;
      setReduceMotion(query.matches);
    };

    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    scrollYRef.current = window.scrollY;
    bodySnapshotRef.current = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    Object.assign(document.body.style, {
      overflow: "hidden",
      position: "fixed",
      top: `-${scrollYRef.current}px`,
      width: "100%",
    });
    restoreBodyRef.current = restoreBody;

    return () => restoreBodyRef.current?.();
  }, [restoreBody]);

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();

    const markReady = () => {
      if (cancelled || readyAtRef.current !== null) return;
      readyAtRef.current = performance.now();
      progressAtReadyRef.current = progressRef.current;
    };

    const normalReadyTimer = window.setTimeout(markReady, NORMAL_READY_TIMEOUT_MS);
    emergencyTimerRef.current = window.setTimeout(() => {
      if (cancelled) return;
      progressRef.current = 100;
      setProgress(100);
      setIsExiting(true);
    }, EMERGENCY_TIMEOUT_MS);

    const readiness = [waitForFrames(), waitForFonts()];
    if (initialPathnameRef.current === "/") readiness.push(waitForJarImage());

    Promise.all(readiness).then(() => {
      window.clearTimeout(normalReadyTimer);
      markReady();
    });

    const updateProgress = (now: number) => {
      if (cancelled) return;

      const elapsed = now - startedAt;
      const readyAt = readyAtRef.current;
      const nextProgress = readyAt === null
        ? elapsed < 650
          ? Math.min(70, (elapsed / 650) * 70)
          : Math.min(92, 70 + 22 * (1 - Math.exp(-(elapsed - 650) / 900)))
        : progressAtReadyRef.current
          + (100 - progressAtReadyRef.current)
            * Math.min(1, (now - readyAt) / (reduceMotionRef.current ? 1 : COMPLETE_DURATION_MS));

      const rounded = Math.min(100, Math.floor(nextProgress));
      progressRef.current = Math.max(progressRef.current, rounded);
      setProgress((previous) => Math.max(previous, rounded));

      if (rounded >= 100) {
        if (emergencyTimerRef.current !== null) {
          window.clearTimeout(emergencyTimerRef.current);
          emergencyTimerRef.current = null;
        }
        if (finishTimerRef.current === null) {
          const remainingMinimum = Math.max(0, MIN_VISIBLE_MS - elapsed);
          finishTimerRef.current = window.setTimeout(
            () => !cancelled && setIsExiting(true),
            remainingMinimum + (reduceMotionRef.current ? 0 : COMPLETE_HOLD_MS),
          );
        }
        return;
      }

      frameRef.current = requestAnimationFrame(updateProgress);
    };

    frameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      cancelled = true;
      window.clearTimeout(normalReadyTimer);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      if (emergencyTimerRef.current !== null) window.clearTimeout(emergencyTimerRef.current);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="app-boot-loader"
      data-exiting={isExiting}
      data-reduced-motion={reduceMotion}
      role="status"
      aria-live="polite"
      aria-label="Preparing The Memory Jar"
      onTransitionEnd={(event) => {
        if (!isExiting || event.target !== event.currentTarget || event.propertyName !== "opacity") return;
        restoreBodyRef.current?.();
        setIsVisible(false);
      }}
    >
      <div className="app-boot-loader__texture" aria-hidden="true" />
      <div className="app-boot-loader__panel app-boot-loader__panel--left" aria-hidden="true" />
      <div className="app-boot-loader__panel app-boot-loader__panel--right" aria-hidden="true" />

      <div className="app-boot-loader__content">
        <div className="w-full max-w-sm">
          <p className="app-boot-loader__label mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em]">
            Preparing your jar...
          </p>
          <p className="app-boot-loader__percentage font-cormorant tabular-nums text-center text-[clamp(4.5rem,20vw,8rem)] leading-none">
            <span aria-hidden="true">{String(progress).padStart(2, "0")}%</span>
          </p>
          <div className="app-boot-loader__track" aria-hidden="true">
            <div
              className="app-boot-loader__progress"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <p className="app-boot-loader__copy mt-3 text-center text-xs">Gathering the little things.</p>
        </div>
      </div>
    </div>
  );
}