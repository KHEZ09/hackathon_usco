"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Libélula vista de lado con alas translúcidas que vibran. Mira hacia la derecha. */
export function Dragonfly({ className }: { className?: string }) {
  const id = useId();
  const reduce = useReducedMotion();
  const flutter = (delay: number) =>
    reduce
      ? undefined
      : { rotate: [0, -14, 6, 0], transition: { duration: 0.09, repeat: Infinity, ease: "linear" as const, delay } };

  const wing = (d: string) => (
    <>
      <path d={d} fill={`url(#${id}-wing)`} stroke="#d8efe9" strokeOpacity="0.55" strokeWidth="0.6" />
      <path d={d} fill={`url(#${id}-vein)`} opacity="0.5" />
    </>
  );

  return (
    <svg viewBox="0 0 200 90" className={cn("overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6f6f2" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#bfe3f0" stopOpacity="0.28" />
          <stop offset="1" stopColor="#f2d9b8" stopOpacity="0.35" />
        </linearGradient>
        <pattern id={`${id}-vein`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <path d="M0 0 L0 5 M0 0 L5 0" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.4" />
        </pattern>
        <linearGradient id={`${id}-abd`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f4f74" />
          <stop offset="0.6" stopColor="#2f8a8a" />
          <stop offset="1" stopColor="#4fb07a" />
        </linearGradient>
        <radialGradient id={`${id}-eye`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#c9f2d8" />
          <stop offset="0.45" stopColor="#3f9a6a" />
          <stop offset="1" stopColor="#12352a" />
        </radialGradient>
      </defs>

      {/* alas traseras */}
      <motion.g style={{ originX: "128px", originY: "40px" }} animate={flutter(0.02)}>
        {wing("M128 40 C 112 8, 70 -2, 58 6 C 70 20, 104 34, 128 42 Z")}
        {wing("M128 42 C 106 56, 66 66, 56 58 C 70 46, 104 42, 128 42 Z")}
      </motion.g>

      {/* abdomen segmentado */}
      <path d="M126 42 C 100 41, 50 43, 8 46 C 6 47, 6 49, 8 49 C 50 47, 100 46, 126 45 Z" fill={`url(#${id}-abd)`} />
      {[20, 34, 48, 62, 76, 90, 104].map((x) => (
        <path key={x} d={`M${x} ${45.6 - (x / 130) * 1.6} v3.4`} stroke="#0f2a3a" strokeWidth="1.1" />
      ))}

      {/* tórax, cabeza y patas */}
      <ellipse cx="138" cy="43" rx="14" ry="8.5" fill="#3d8a58" />
      <ellipse cx="136" cy="40" rx="8" ry="3.2" fill="#9fd3a8" opacity="0.5" />
      <circle cx="156" cy="41" r="8" fill={`url(#${id}-eye)`} />
      <circle cx="158" cy="38.5" r="1.8" fill="#fff" opacity="0.7" />
      <g stroke="#1d2b24" strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M132 50 L126 62 L130 70" />
        <path d="M138 51 L136 64 L141 72" />
        <path d="M144 50 L148 61 L154 67" />
      </g>

      {/* alas delanteras */}
      <motion.g style={{ originX: "140px", originY: "38px" }} animate={flutter(0)}>
        {wing("M140 38 C 132 4, 98 -12, 80 -8 C 88 10, 118 30, 140 40 Z")}
        {wing("M140 40 C 124 60, 92 74, 78 70 C 90 54, 118 44, 140 40 Z")}
      </motion.g>
    </svg>
  );
}
