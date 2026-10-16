"use client";

import { useId } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Droplets } from "lucide-react";
import { metricRange } from "@/data/cacaoProcessData";
import { cn } from "@/lib/cn";

/** Medidor de humedad: anillo y cifra que bajan con el scroll según la métrica editable. */
export function HumidityMeter({ metric, progress, className }: { metric: { label: string; value: string }; progress: MotionValue<number>; className?: string }) {
  const [desde, hasta] = metricRange(metric.value) ?? [55, 7];
  const valor = useTransform(progress, (v) => Math.round(desde + (hasta - desde) * v));
  const anillo = useTransform(progress, (v) => 1 - v * (1 - hasta / desde));
  const color = useTransform(progress, [0, 1], ["#6fa6c9", "#c98a2b"]);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-crema/15 bg-[#121211]/65 px-4 py-3 backdrop-blur-md", className)}>
      <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(239,227,207,0.15)" strokeWidth="4" />
        <motion.circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" strokeLinecap="round" style={{ pathLength: anillo, stroke: color }} />
      </svg>
      <div>
        <p className="flex items-center gap-1 text-[0.6rem] font-semibold tracking-[0.22em] text-crema/60 uppercase">
          <Droplets className="size-3" /> {metric.label}
        </p>
        <p className="font-mono text-xl font-semibold text-crema">
          <motion.span>{valor}</motion.span>%<span className="ml-1.5 text-[0.65rem] font-normal text-crema/50">{metric.value}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Anillo orbital alrededor del saco. Se dibuja en dos mitades: la de atrás queda detrás del saco
 * y la de adelante encima, para que el anillo realmente lo rodee.
 */
export function OrbitalRing({ giro, mitad, className }: { giro: MotionValue<number>; mitad: "atras" | "adelante"; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 400 140" className={cn("pointer-events-none absolute overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6e3b0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#f6e3b0" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#c98a2b" stopOpacity="0.6" />
          <stop offset="1" stopColor="#c98a2b" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          {mitad === "atras" ? <rect x="-20" y="-20" width="440" height="90" /> : <rect x="-20" y="70" width="440" height="90" />}
        </clipPath>
        <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${id}-c)`} filter={`url(#${id}-glow)`} opacity={mitad === "atras" ? 0.55 : 1}>
        <motion.ellipse cx="200" cy="70" rx="190" ry="48" fill="none" stroke={`url(#${id}-o)`} strokeWidth="2.2" strokeDasharray="520 700" style={{ strokeDashoffset: giro }} />
        <ellipse cx="200" cy="70" rx="190" ry="48" fill="none" stroke="#f6e3b0" strokeOpacity="0.12" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** Destellos vectoriales de cuatro puntas que titilan. */
export function Destellos({ puntos, className }: { puntos: Array<[number, number, number]>; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {puntos.map(([x, y, s], i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="absolute [animation:destello_2.8s_ease-in-out_infinite] drop-shadow-[0_0_6px_rgba(246,227,176,0.8)]"
          style={{ left: `${x}%`, top: `${y}%`, width: s, animationDelay: `${-i * 0.7}s` }}
        >
          <path d="M10 0 C 11 7, 13 9, 20 10 C 13 11, 11 13, 10 20 C 9 13, 7 11, 0 10 C 7 9, 9 7, 10 0 Z" fill="#f6e3b0" />
        </svg>
      ))}
    </div>
  );
}

/** Haces de sol que barren la escena del secado. */
export function RayosSol({ progress }: { progress: MotionValue<number> }) {
  const x = useTransform(progress, [0, 1], ["-10%", "12%"]);
  const opacity = useTransform(progress, [0, 0.3, 1], [0.4, 0.9, 0.7]);
  return (
    <motion.div style={{ x, opacity }} aria-hidden="true" className="pointer-events-none absolute -inset-[10%] mix-blend-screen">
      <div className="absolute top-0 left-[20%] h-[140%] w-[14%] -rotate-[28deg] bg-gradient-to-b from-[#f6e3b0]/35 to-transparent blur-2xl" />
      <div className="absolute top-0 left-[42%] h-[140%] w-[8%] -rotate-[28deg] bg-gradient-to-b from-[#f6e3b0]/25 to-transparent blur-2xl" />
      <div className="absolute top-0 left-[60%] h-[140%] w-[18%] -rotate-[28deg] bg-gradient-to-b from-[#f6e3b0]/20 to-transparent blur-3xl" />
    </motion.div>
  );
}
