"use client";

import { useCallback, useEffect, useRef } from "react";

const BASE_VELOCITY = -0.018;
const FRICTION = 0.92;
const SNAP_EASING = 0.12;
const DRAG_THRESHOLD = 7;

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

export function useOrbitPhysics({ orbitNode, itemCount, selectedIndex, onSelect, paused, reduceMotion }: {
  orbitNode: HTMLDivElement | null;
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  paused: boolean;
  reduceMotion: boolean;
}) {
  const frameRef = useRef<number | null>(null);
  const currentRotation = useRef(0);
  const userVelocity = useRef(0);
  const targetRotation = useRef<number | null>(null);
  const isDragging = useRef(false);
  const lastPointerX = useRef(0);
  const dragDistance = useRef(0);
  const lastInteractionTime = useRef(0);
  const activePointerId = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const updateCards = useCallback((rotation: number) => {
    const step = 360 / Math.max(itemCount, 1);
    orbitNode?.querySelectorAll<HTMLElement>(".track-orbit-card").forEach((card, index) => {
      const absoluteAngle = index * step + rotation;
      const focus = Math.max(0, Math.min(1, 1 - Math.abs(normalizeAngle(absoluteAngle)) / 180));
      card.style.setProperty("--counterRotation", `${-absoluteAngle}deg`);
      card.style.setProperty("--itemOpacity", `${0.15 + focus * 0.85}`);
      card.style.setProperty("--itemBlur", `${(1 - focus) * 6}px`);
      card.style.setProperty("--itemScale", `${0.78 + focus * 0.3}`);
      card.style.zIndex = String(Math.round(focus * 100));
      card.dataset.focused = index === selectedIndex ? "true" : "false";
    });
  }, [itemCount, orbitNode, selectedIndex]);

  useEffect(() => { updateCards(currentRotation.current); }, [updateCards]);

  useEffect(() => {
    if (!orbitNode || paused || reduceMotion || itemCount === 0) return;
    const tick = () => {
      const now = performance.now();
      const target = targetRotation.current;
      if (target !== null) {
        const delta = normalizeAngle(target - currentRotation.current);
        if (Math.abs(delta) < 0.18) { currentRotation.current = target; targetRotation.current = null; lastInteractionTime.current = now; }
        else currentRotation.current += delta * SNAP_EASING;
      } else {
        const idle = now - lastInteractionTime.current > 700;
        currentRotation.current += idle ? BASE_VELOCITY + userVelocity.current : userVelocity.current;
        userVelocity.current *= FRICTION;
        if (Math.abs(userVelocity.current) < 0.0005) userVelocity.current = 0;
      }
      orbitNode.style.transform = `rotate(${currentRotation.current}deg)`;
      updateCards(currentRotation.current);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    if (process.env.NODE_ENV === "development") console.debug("[music-orbit]", { activeCards: itemCount });
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); frameRef.current = null; };
  }, [itemCount, orbitNode, paused, reduceMotion, updateCards]);

  useEffect(() => {
    if (!orbitNode || itemCount === 0) return;
    const items = Array.from(orbitNode.querySelectorAll<HTMLButtonElement>(".track-orbit-item"));
    const select = (index: number) => {
      if (suppressClick.current) { suppressClick.current = false; return; }
      targetRotation.current = -index * (360 / Math.max(itemCount, 1));
      userVelocity.current = 0;
      lastInteractionTime.current = performance.now();
      onSelect(index);
    };
    const cleanups = items.map((item, index) => {
      const onWheel = (event: WheelEvent) => {
        userVelocity.current += Math.max(-36, Math.min(36, event.deltaY)) * -0.003;
        lastInteractionTime.current = performance.now();
      };
      const onPointerDown = (event: PointerEvent) => {
        activePointerId.current = event.pointerId;
        isDragging.current = false;
        suppressClick.current = false;
        dragDistance.current = 0;
        lastPointerX.current = event.clientX;
        lastInteractionTime.current = performance.now();
        item.setPointerCapture(event.pointerId);
      };
      const onPointerMove = (event: PointerEvent) => {
        if (activePointerId.current !== event.pointerId) return;
        const delta = event.clientX - lastPointerX.current;
        dragDistance.current += Math.abs(delta);
        isDragging.current = isDragging.current || dragDistance.current > DRAG_THRESHOLD;
        if (isDragging.current) { userVelocity.current = Math.max(-2.2, Math.min(2.2, delta * 0.035)); lastInteractionTime.current = performance.now(); }
        lastPointerX.current = event.clientX;
      };
      const finishPointer = (event: PointerEvent) => {
        if (activePointerId.current !== event.pointerId) return;
        suppressClick.current = isDragging.current;
        activePointerId.current = null;
        isDragging.current = false;
        dragDistance.current = 0;
        lastInteractionTime.current = performance.now();
        if (item.hasPointerCapture(event.pointerId)) item.releasePointerCapture(event.pointerId);
      };
      const onClick = () => select(index);
      item.addEventListener("wheel", onWheel, { passive: true });
      item.addEventListener("pointerdown", onPointerDown);
      item.addEventListener("pointermove", onPointerMove);
      item.addEventListener("pointerup", finishPointer);
      item.addEventListener("pointercancel", finishPointer);
      item.addEventListener("click", onClick);
      return () => {
        item.removeEventListener("wheel", onWheel);
        item.removeEventListener("pointerdown", onPointerDown);
        item.removeEventListener("pointermove", onPointerMove);
        item.removeEventListener("pointerup", finishPointer);
        item.removeEventListener("pointercancel", finishPointer);
        item.removeEventListener("click", onClick);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [itemCount, onSelect, orbitNode]);
}