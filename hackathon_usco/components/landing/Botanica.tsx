"use client";

import { useId } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Viento ligado al scroll: la velocidad del desplazamiento empuja las ramas y un resorte
 * poco amortiguado las deja oscilar al detenerse, como una ráfaga.
 */
export function useWind(fuerza = 1) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const push = useTransform(velocity, [-2600, 0, 2600], [-12 * fuerza, 0, 12 * fuerza], { clamp: true });
  const wind = useSpring(push, { stiffness: 38, damping: 5, mass: 0.9 });
  return reduce ? undefined : wind;
}

type LeafTone = "profundo" | "medio" | "claro" | "brote";
const LEAF: Record<LeafTone, [string, string, string]> = {
  profundo: ["#0e2618", "#1d4a2c", "#2f6a3e"],
  medio: ["#1b4a2a", "#2f7341", "#5d9a52"],
  claro: ["#3a7a35", "#6fa64e", "#b4d27a"],
  // Los brotes nuevos del cacao son cobrizos.
  brote: ["#5a2a1a", "#9a4a2c", "#d08a5a"],
};

/** Hoja de cacao: alargada, base redondeada, punta en gota y nervadura marcada. */
export function CacaoLeaf({ className, tone = "medio" }: { className?: string; tone?: LeafTone }) {
  const id = useId();
  const [dark, mid, light] = LEAF[tone];
  return (
    <svg viewBox="0 0 260 90" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M4 46 C 30 12, 120 2, 206 30 C 228 37, 244 42, 258 46 C 244 50, 228 56, 206 62 C 120 88, 30 80, 4 46 Z" fill={`url(#${id}-g)`} />
      <path d="M26 34 C 80 16, 150 16, 214 36" fill="none" stroke={`url(#${id}-s)`} strokeWidth="10" strokeLinecap="round" />
      <path d="M6 46 C 80 42, 170 42, 256 46" fill="none" stroke={light} strokeOpacity="0.8" strokeWidth="1.8" />
      {[36, 64, 92, 120, 148, 176, 202].map((x) => (
        <g key={x} stroke={light} strokeOpacity="0.42" strokeWidth="1.1" fill="none">
          <path d={`M${x} 44 C ${x + 14} 34, ${x + 22} 26, ${x + 30} 18`} />
          <path d={`M${x} 46 C ${x + 14} 56, ${x + 22} 64, ${x + 30} 72`} />
        </g>
      ))}
    </svg>
  );
}

type PodTone = "roja" | "morada" | "amarilla";
const POD: Record<PodTone, [string, string, string]> = {
  roja: ["#e0576a", "#a3203a", "#4f0b1e"],
  morada: ["#b0587e", "#6e2348", "#2c0918"],
  amarilla: ["#f6c35a", "#d0821f", "#7a3d10"],
};

/** Fruto de cacao con surcos longitudinales, textura rugosa y brillo. Vertical, pedúnculo arriba. */
export function CacaoPod({ className, tone = "roja" }: { className?: string; tone?: PodTone }) {
  const id = useId();
  const [light, mid, dark] = POD[tone];
  return (
    <svg viewBox="0 0 100 210" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-b`} cx="0.36" cy="0.32" r="0.8">
          <stop offset="0" stopColor={light} />
          <stop offset="0.48" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <clipPath id={`${id}-c`}>
          <path d="M50 22 C 78 26, 92 70, 90 112 C 88 156, 70 192, 50 206 C 30 192, 12 156, 10 112 C 8 70, 22 26, 50 22 Z" />
        </clipPath>
      </defs>
      <path d="M50 24 C 49 14, 52 6, 58 1" fill="none" stroke="#6a5a3a" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 22 C 78 26, 92 70, 90 112 C 88 156, 70 192, 50 206 C 30 192, 12 156, 10 112 C 8 70, 22 26, 50 22 Z" fill={`url(#${id}-b)`} />
      <g clipPath={`url(#${id}-c)`}>
        {[-34, -22, -10, 2, 14, 26, 38].map((dx) => (
          <path
            key={dx}
            d={`M${50 + dx * 0.25} 22 C ${50 + dx * 1.15} 70, ${50 + dx * 1.15} 150, ${50 + dx * 0.25} 206`}
            fill="none"
            stroke={dark}
            strokeOpacity="0.55"
            strokeWidth="2.6"
          />
        ))}
        {[-28, -16, -4, 8, 20, 32].map((dx) => (
          <path
            key={dx}
            d={`M${50 + dx * 0.25} 22 C ${50 + dx * 1.15} 70, ${50 + dx * 1.15} 150, ${50 + dx * 0.25} 206`}
            fill="none"
            stroke={light}
            strokeOpacity="0.28"
            strokeWidth="2"
          />
        ))}
        <ellipse cx="34" cy="78" rx="10" ry="30" fill="#fff" opacity="0.18" />
        <rect x="0" y="0" width="100" height="210" fill={dark} opacity="0.12" />
      </g>
    </svg>
  );
}

/** Grano de cacao (semilla) realista: forma de almendra gruesa, textura de cascarilla con estrías longitudinales suaves (sin hendidura de café) y gradiente cálido de chocolate. */
export function CacaoBean({ className, variant = 1 }: { className?: string; variant?: 1 | 2 | 3 }) {
  const id = useId();

  if (variant === 2) {
    return (
      <svg viewBox="0 0 50 64" className={cn("drop-shadow-[0_8px_14px_rgba(20,8,4,0.38)]", className)} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-g2`} cx="42%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#a3572a" />
            <stop offset="28%" stopColor="#76391a" />
            <stop offset="68%" stopColor="#48200f" />
            <stop offset="100%" stopColor="#1e0b04" />
          </radialGradient>
        </defs>
        <ellipse cx="25" cy="58" rx="15" ry="4" fill="#140602" opacity="0.3" filter="blur(3px)" />
        <path
          d="M 22 4 C 33 5, 46 17, 46 35 C 46 51, 37 60, 24 61 C 13 61, 4 52, 4 37 C 4 21, 11 7, 22 4 Z"
          fill={`url(#${id}-g2)`}
        />
        <path d="M 17 11 C 11 23, 12 43, 20 54" fill="none" stroke="#bd703c" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 19 12 C 13 24, 14 44, 22 55" fill="none" stroke="#1b0803" strokeOpacity="0.4" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M 31 13 C 36 26, 35 44, 29 53" fill="none" stroke="#1b0803" strokeOpacity="0.32" strokeWidth="1" strokeLinecap="round" />
        <path d="M 30 13 C 35 26, 34 44, 28 53" fill="none" stroke="#ac6132" strokeOpacity="0.22" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="16" cy="24" rx="4" ry="12" fill="#fff" opacity="0.14" transform="rotate(-14 16 24)" />
      </svg>
    );
  }

  if (variant === 3) {
    return (
      <svg viewBox="0 0 46 66" className={cn("drop-shadow-[0_8px_14px_rgba(20,8,4,0.38)]", className)} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-g3`} cx="36%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#944d24" />
            <stop offset="32%" stopColor="#683115" />
            <stop offset="72%" stopColor="#3e1a0b" />
            <stop offset="100%" stopColor="#1a0803" />
          </radialGradient>
        </defs>
        <ellipse cx="23" cy="60" rx="13" ry="4" fill="#140602" opacity="0.3" filter="blur(3px)" />
        <path
          d="M 23 3 C 33 8, 42 20, 42 38 C 42 53, 34 62, 23 63 C 12 62, 5 52, 5 37 C 5 19, 13 6, 23 3 Z"
          fill={`url(#${id}-g3)`}
        />
        <path d="M 18 9 C 14 21, 14 43, 20 56" fill="none" stroke="#b86937" strokeOpacity="0.34" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 20 10 C 16 22, 16 44, 22 57" fill="none" stroke="#1a0803" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M 27 11 C 31 23, 32 43, 26 54" fill="none" stroke="#1a0803" strokeOpacity="0.32" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="15" cy="23" rx="4" ry="11" fill="#fff" opacity="0.12" transform="rotate(-15 15 23)" />
      </svg>
    );
  }

  // Variant 1 (default)
  return (
    <svg viewBox="0 0 46 64" className={cn("drop-shadow-[0_8px_14px_rgba(20,8,4,0.38)]", className)} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g1`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#9a5228" />
          <stop offset="30%" stopColor="#703619" />
          <stop offset="70%" stopColor="#441e0d" />
          <stop offset="100%" stopColor="#220d05" />
        </radialGradient>
      </defs>
      <ellipse cx="23" cy="58" rx="14" ry="4" fill="#140602" opacity="0.3" filter="blur(3px)" />
      <path
        d="M 23 4 C 33 7, 43 18, 43 36 C 43 51, 35 60, 23 61 C 12 60, 4 50, 4 35 C 4 19, 13 6, 23 4 Z"
        fill={`url(#${id}-g1)`}
      />
      <path d="M 18 10 C 13 22, 13 42, 19 54" fill="none" stroke="#b66a38" strokeOpacity="0.32" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 20 11 C 15 23, 15 43, 21 55" fill="none" stroke="#1f0a04" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M 28 12 C 33 24, 33 42, 27 52" fill="none" stroke="#1f0a04" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round" />
      <path d="M 27 12 C 32 24, 32 42, 26 52" fill="none" stroke="#a85d2f" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
      <path d="M 24 16 C 22 28, 23 40, 24 48" fill="none" stroke="#d0844d" strokeOpacity="0.18" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="16" cy="22" rx="4.5" ry="11" fill="#fff" opacity="0.13" transform="rotate(-16 16 22)" />
    </svg>
  );
}

type BranchProps = {
  className?: string;
  wind?: MotionValue<number>;
  /** "derecha" voltea la rama horizontalmente. */
  lado?: "izquierda" | "derecha";
};

/**
 * Rama de cacao con hojas y frutos de cacao colgando del tallo (cauliflora).
 * Hojas y frutos oscilan con su propio ritmo y responden al viento del scroll.
 */
export function CacaoBranch({ className, wind, lado = "izquierda" }: BranchProps) {
  const id = useId();
  const fallback = useSpring(0);
  const w = wind ?? fallback;
  const rama = useTransform(w, (v) => v * 0.35);
  const hojas = useTransform(w, (v) => v * 1.1);
  const cacaos = useTransform(w, (v) => -v * 1.6);

  const leaves: Array<{ x: number; y: number; r: number; s: number; tone: LeafTone; d: number }> = [
    { x: 40, y: 150, r: -32, s: 0.9, tone: "profundo", d: 0 },
    { x: 92, y: 168, r: 30, s: 0.85, tone: "medio", d: 0.6 },
    { x: 180, y: 104, r: -58, s: 0.82, tone: "brote", d: 1.1 },
    { x: 200, y: 128, r: 18, s: 1, tone: "medio", d: 0.3 },
    { x: 330, y: 70, r: -40, s: 0.88, tone: "claro", d: 0.9 },
    { x: 350, y: 92, r: 26, s: 0.95, tone: "profundo", d: 1.5 },
    { x: 470, y: 40, r: -22, s: 0.7, tone: "medio", d: 0.4 },
  ];
  const pods: Array<{ x: number; y: number; s: number; tone: PodTone; d: number }> = [
    { x: 150, y: 150, s: 0.8, tone: "roja", d: 0.2 },
    { x: 262, y: 116, s: 0.62, tone: "amarilla", d: 0.9 },
    { x: 410, y: 76, s: 0.55, tone: "morada", d: 1.4 },
  ];

  return (
    <div
      className={cn("relative", lado === "derecha" && "-scale-x-100", className)}
      aria-hidden="true"
    >
      <motion.div
        style={{ rotate: rama }}
        className="relative w-full origin-left"
      >
        <svg viewBox="0 0 600 300" className="block w-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-tallo`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a8a6a" />
            <stop offset="0.5" stopColor="#5d5a40" />
            <stop offset="1" stopColor="#35301f" />
          </linearGradient>
        </defs>
        <path d="M-20 220 C 110 182, 240 140, 360 98 C 450 66, 520 44, 620 24" fill="none" stroke={`url(#${id}-tallo)`} strokeWidth="14" strokeLinecap="round" />
        {/* líquenes del tallo */}
        {[60, 140, 230, 310, 420].map((x, i) => (
          <ellipse key={x} cx={x} cy={204 - x * 0.31} rx={9 - (i % 2) * 3} ry="3.5" fill="#9fb8a0" opacity="0.5" />
        ))}
      </svg>

      {leaves.map((l, i) => (
        <motion.div
          key={i}
          style={{ rotate: hojas, left: `${(l.x / 600) * 100}%`, top: `${(l.y / 300) * 100}%`, width: `${36 * l.s}%` }}
          className="absolute origin-left"
        >
          <div className="origin-left animate-sway" style={{ animationDelay: `${-l.d}s`, rotate: `${l.r}deg` }}>
            <CacaoLeaf tone={l.tone} className="w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]" />
          </div>
        </motion.div>
      ))}

      {pods.map((p, i) => (
        <motion.div
          key={i}
          style={{ rotate: cacaos, left: `${(p.x / 600) * 100}%`, top: `${(p.y / 300) * 100}%`, width: `${13 * p.s}%` }}
          className="absolute origin-top -translate-x-1/2"
        >
          <div className="origin-top animate-sway" style={{ animationDelay: `${-p.d}s`, animationDuration: "6.5s" }}>
            <CacaoPod tone={p.tone} className="w-full drop-shadow-[0_14px_14px_rgba(0,0,0,0.35)]" />
          </div>
        </motion.div>
      ))}
      </motion.div>
    </div>
  );
}
