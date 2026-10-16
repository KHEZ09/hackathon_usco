"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Colibrí iridiscente en SVG con aleteo continuo. Mira hacia la derecha. */
export function Hummingbird({ className }: { className?: string }) {
  const id = useId();
  const reduce = useReducedMotion();
  const flap = reduce
    ? undefined
    : { scaleY: [1, -0.35, 1], transition: { duration: 0.11, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <svg viewBox="0 0 140 90" className={cn("overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fa36b" />
          <stop offset="0.55" stopColor="#1d7a5a" />
          <stop offset="1" stopColor="#14485a" />
        </linearGradient>
        <linearGradient id={`${id}-head`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fd1a0" />
          <stop offset="0.6" stopColor="#1f8fb0" />
          <stop offset="1" stopColor="#3a4fb8" />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#5a7c6a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#c9d8cf" stopOpacity="0.25" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* ala trasera */}
      <motion.g style={{ originX: "64px", originY: "40px" }} animate={flap} opacity={0.55} filter={`url(#${id}-blur)`}>
        <path d="M64 40 C 50 18, 38 4, 20 -2 C 34 14, 46 30, 58 44 Z" fill={`url(#${id}-wing)`} />
      </motion.g>

      {/* cola */}
      <path d="M40 52 L8 70 L16 58 L4 60 L30 46 Z" fill="#123a35" />
      <path d="M38 50 L12 64 L28 47 Z" fill="#1d6b52" opacity="0.8" />

      {/* cuerpo */}
      <path d="M36 50 C 44 36, 62 30, 78 32 C 84 40, 80 52, 66 58 C 54 62, 42 58, 36 50 Z" fill={`url(#${id}-body)`} />
      <path d="M58 56 C 66 54, 74 50, 78 44 C 76 52, 70 58, 60 60 Z" fill="#e9e2d0" opacity="0.65" />

      {/* cabeza y pico */}
      <circle cx="82" cy="31" r="10.5" fill={`url(#${id}-head)`} />
      <path d="M90 28.5 L134 24 L90 32.5 Z" fill="#1b1b1b" />
      <path d="M78 38 C 82 42, 88 40, 90 35 C 86 38, 82 38, 78 38 Z" fill="#b8264e" opacity="0.9" />
      <circle cx="85.5" cy="28.5" r="2.4" fill="#0b0b0b" />
      <circle cx="86.3" cy="27.7" r="0.8" fill="#fff" />

      {/* ala delantera */}
      <motion.g style={{ originX: "66px", originY: "38px" }} animate={flap} filter={`url(#${id}-blur)`}>
        <path d="M66 38 C 60 14, 54 -2, 40 -12 C 46 8, 52 26, 60 42 Z" fill={`url(#${id}-wing)`} />
        <path d="M66 38 C 62 20, 58 6, 50 -4" fill="none" stroke="#e8efe9" strokeOpacity="0.4" strokeWidth="1" />
      </motion.g>
    </svg>
  );
}
