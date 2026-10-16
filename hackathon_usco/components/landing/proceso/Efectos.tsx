"use client";

import { useId } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

/** Grano de cacao: "fresco" (blanco, recién salido de la mazorca) o "seco" (fermentado y secado). */
export function Grano({ tipo = "fresco", className }: { tipo?: "fresco" | "seco"; className?: string }) {
  const id = useId();
  const [a, b, c] = tipo === "fresco" ? ["#fffaf1", "#efe3cf", "#c9b394"] : ["#c98a5c", "#7a4526", "#3d1f10"];
  return (
    <svg viewBox="0 0 40 60" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={a} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="30" rx="15" ry="27" fill={`url(#${id}-g)`} />
      {tipo === "seco" && <path d="M20 6 C 16 22, 24 38, 20 54" fill="none" stroke="#2c140a" strokeOpacity="0.5" strokeWidth="1.4" />}
      <ellipse cx="13" cy="18" rx="3.5" ry="8" fill="#fff" opacity={tipo === "fresco" ? 0.55 : 0.22} />
    </svg>
  );
}

type Caida = { x: number; delay: number; giro: number; tam: number };

/**
 * Granos que caen controlados por el scroll: cada uno recorre su trayectoria según el progreso
 * local de la etapa (0→1), con desfase y giro propios.
 */
export function GranosCayendo({
  progreso,
  granos,
  tipo,
  desde,
  hasta,
  className,
}: {
  progreso: MotionValue<number>;
  granos: Caida[];
  tipo: "fresco" | "seco";
  desde: string;
  hasta: string;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {granos.map((g, i) => (
        <GranoCayendo key={i} progreso={progreso} g={g} tipo={tipo} desde={desde} hasta={hasta} />
      ))}
    </div>
  );
}

function GranoCayendo({ progreso, g, tipo, desde, hasta }: { progreso: MotionValue<number>; g: Caida; tipo: "fresco" | "seco"; desde: string; hasta: string }) {
  // Cada grano repite su caída tres veces dentro de la etapa para que el flujo sea continuo.
  const t = useTransform(progreso, (v) => ((v * 3 + g.delay) % 1 + 1) % 1);
  const y = useTransform(t, [0, 1], [desde, hasta]);
  const rotate = useTransform(t, [0, 1], [0, g.giro]);
  const opacity = useTransform(t, [0, 0.12, 0.85, 1], [0, 1, 1, 0]);
  return (
    <motion.div style={{ top: 0, left: `${g.x}%`, y, rotate, opacity, width: g.tam }} className="absolute">
      <Grano tipo={tipo} className="w-full drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)]" />
    </motion.div>
  );
}

/** Vapor de la fermentación: volutas difusas que suben. */
export function Vapor({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute", className)}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute bottom-0 h-1/2 w-1/3 rounded-full bg-[#e9e2d6]/25 blur-2xl [animation:vapor_6s_ease-in-out_infinite]"
          style={{ left: `${8 + i * 22}%`, animationDelay: `${-i * 1.5}s` }}
        />
      ))}
    </div>
  );
}

/** Destellos dorados de cuatro puntas, como en el empaque del video. */
export function Destellos({ puntos, className }: { puntos: Array<[number, number, number]>; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {puntos.map(([x, y, s], i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="absolute [animation:destello_2.8s_ease-in-out_infinite]"
          style={{ left: `${x}%`, top: `${y}%`, width: s, animationDelay: `${-i * 0.7}s` }}
        >
          <path d="M10 0 C 11 7, 13 9, 20 10 C 13 11, 11 13, 10 20 C 9 13, 7 11, 0 10 C 7 9, 9 7, 10 0 Z" fill="#f6e3b0" />
        </svg>
      ))}
    </div>
  );
}

/** Anillo orbital luminoso que rodea el saco y gira con el scroll. */
export function AnilloOrbital({ giro, className }: { giro: MotionValue<number>; className?: string }) {
  const id = useId();
  return (
    <motion.svg viewBox="0 0 400 140" className={cn("pointer-events-none absolute", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6e3b0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#f6e3b0" stopOpacity="0.9" />
          <stop offset="0.7" stopColor="#c98a2b" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c98a2b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.ellipse
        cx="200"
        cy="70"
        rx="190"
        ry="52"
        fill="none"
        stroke={`url(#${id}-o)`}
        strokeWidth="2"
        strokeDasharray="520 700"
        style={{ strokeDashoffset: giro }}
      />
    </motion.svg>
  );
}
