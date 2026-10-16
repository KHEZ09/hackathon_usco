"use client";

import { useId } from "react";

type LeafProps = { className?: string; tone?: "profundo" | "medio" | "claro" };

const LEAF_TONES = {
  profundo: ["#0f2a1c", "#1d4a31", "#2c6a45"],
  medio: ["#1d4a31", "#2f7048", "#4f9160"],
  claro: ["#3d7a3f", "#6aa055", "#a9c873"],
} as const;

/** Hoja de cafÃ©: elÃ­ptica, punta marcada, nervadura central y laterales. */
export function CoffeeLeaf({ className, tone = "medio" }: LeafProps) {
  const id = useId();
  const [dark, mid, light] = LEAF_TONES[tone];
  return (
    <svg viewBox="0 0 220 90" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M4 46 C 40 6, 128 -2, 216 44 C 130 92, 42 86, 4 46 Z"
        fill={`url(#${id}-g)`}
      />
      <path d="M20 36 C 70 14, 140 14, 200 40" fill="none" stroke={`url(#${id}-s)`} strokeWidth="9" strokeLinecap="round" />
      <path d="M6 46 C 70 40, 150 40, 214 44" fill="none" stroke={light} strokeOpacity="0.75" strokeWidth="1.6" />
      {[38, 66, 94, 122, 150, 176].map((x) => (
        <g key={x} stroke={light} strokeOpacity="0.45" strokeWidth="1" fill="none">
          <path d={`M${x} 44 C ${x + 10} 32, ${x + 18} 26, ${x + 26} 20`} />
          <path d={`M${x} 44 C ${x + 10} 56, ${x + 18} 63, ${x + 26} 68`} />
        </g>
      ))}
    </svg>
  );
}

/** Rama con hojas y frutos rojos de cafÃ©, en primer plano. */
export function CoffeeBranch({ className }: { className?: string }) {
  const id = useId();
  const cherries: Array<[number, number, number]> = [
    [212, 112, 15], [232, 104, 16], [224, 128, 15], [246, 122, 14], [204, 132, 13], [240, 140, 12],
    [372, 86, 15], [392, 78, 14], [384, 102, 15], [404, 96, 13], [362, 106, 12],
    [516, 66, 13], [534, 60, 12], [526, 80, 12],
  ];
  return (
    <svg viewBox="0 0 600 240" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-c`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#e2585a" />
          <stop offset="0.45" stopColor="#a3262a" />
          <stop offset="1" stopColor="#5a0e12" />
        </radialGradient>
        <radialGradient id={`${id}-v`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#c7d98a" />
          <stop offset="1" stopColor="#5d7d33" />
        </radialGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b9a55" />
          <stop offset="0.5" stopColor="#2f6b3f" />
          <stop offset="1" stopColor="#163a26" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b2416" />
          <stop offset="1" stopColor="#7a5038" />
        </linearGradient>
      </defs>
      <path
        d="M-10 214 C 120 170, 260 132, 360 100 C 440 74, 520 58, 610 40"
        fill="none"
        stroke={`url(#${id}-b)`}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <g transform="translate(60 150) rotate(-28)"><CoffeeLeafShape id={id} /></g>
      <g transform="translate(150 182) rotate(32) scale(0.95)"><CoffeeLeafShape id={id} /></g>
      <g transform="translate(280 112) rotate(-52) scale(0.9)"><CoffeeLeafShape id={id} /></g>
      <g transform="translate(300 138) rotate(26) scale(1.05)"><CoffeeLeafShape id={id} /></g>
      <g transform="translate(450 70) rotate(-40) scale(0.8)"><CoffeeLeafShape id={id} /></g>
      <g transform="translate(470 92) rotate(22) scale(0.85)"><CoffeeLeafShape id={id} /></g>
      {cherries.map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill={i % 7 === 5 ? `url(#${id}-v)` : `url(#${id}-c)`} />
          <ellipse cx={cx - r * 0.35} cy={cy - r * 0.4} rx={r * 0.28} ry={r * 0.18} fill="#fff" opacity="0.45" />
          <circle cx={cx + r * 0.1} cy={cy + r * 0.62} r={r * 0.12} fill="#2a0608" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

function CoffeeLeafShape({ id }: { id: string }) {
  return (
    <g>
      <path d="M0 0 C 30 -32, 100 -38, 160 -4 C 100 30, 34 30, 0 0 Z" fill={`url(#${id}-l)`} />
      <path d="M2 0 C 50 -6, 110 -6, 158 -4" fill="none" stroke="#a9c873" strokeOpacity="0.6" strokeWidth="1.4" />
      {[28, 52, 76, 100, 124].map((x) => (
        <g key={x} fill="none" stroke="#a9c873" strokeOpacity="0.35" strokeWidth="0.9">
          <path d={`M${x} -2 C ${x + 8} -12, ${x + 14} -17, ${x + 20} -22`} />
          <path d={`M${x} -2 C ${x + 8} 8, ${x + 14} 13, ${x + 20} 17`} />
        </g>
      ))}
    </g>
  );
}
