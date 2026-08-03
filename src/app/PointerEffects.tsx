"use client";

import { useEffect } from "react";

type Point = { clientX: number; clientY: number };
type Bounds = { left: number; top: number; width: number; height: number };

const MAX_TILT = 6;

export function calculateTilt(point: Point, bounds: Bounds): { rotateX: number; rotateY: number } {
  if (bounds.width <= 0 || bounds.height <= 0) return { rotateX: 0, rotateY: 0 };
  const x = (point.clientX - bounds.left) / bounds.width;
  const y = (point.clientY - bounds.top) / bounds.height;
  const clamp = (value: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, value));
  return {
    rotateX: clamp((.5 - y) * MAX_TILT * 2),
    rotateY: clamp((x - .5) * MAX_TILT * 2),
  };
}

export function PointerEffects() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const root = document.documentElement;
    let frame = 0;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;

    const paintPointer = () => {
      root.style.setProperty("--pointer-x", `${(lastX / window.innerWidth) * 100}%`);
      root.style.setProperty("--pointer-y", `${(lastY / window.innerHeight) * 100}%`);
      root.style.setProperty("--parallax-x", `${((lastX / window.innerWidth) - .5) * 22}px`);
      root.style.setProperty("--parallax-y", `${((lastY / window.innerHeight) - .5) * 16}px`);
      frame = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paintPointer);

      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-tilt]");
      if (!target) return;
      const tilt = calculateTilt(event, target.getBoundingClientRect());
      target.style.setProperty("--tilt-x", `${tilt.rotateX}deg`);
      target.style.setProperty("--tilt-y", `${tilt.rotateY}deg`);
      target.style.setProperty("--glow-x", `${event.clientX - target.getBoundingClientRect().left}px`);
      target.style.setProperty("--glow-y", `${event.clientY - target.getBoundingClientRect().top}px`);
      target.dataset.tiltActive = "true";
    };

    const onPointerOut = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-tilt]");
      if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
      target.style.setProperty("--tilt-x", "0deg");
      target.style.setProperty("--tilt-y", "0deg");
      delete target.dataset.tiltActive;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--pointer-x");
      root.style.removeProperty("--pointer-y");
      root.style.removeProperty("--parallax-x");
      root.style.removeProperty("--parallax-y");
    };
  }, []);

  return null;
}
