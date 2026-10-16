"use client";

import { useMemo } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { encodeQr } from "@/lib/qr";
import { azar, seg, suave } from "./geometria";

/*
 * Escena "empaque": saco de fique ORIVIA con QR y huella SHA-256, granos secos que caen dentro,
 * anillo orbital que rodea el saco (mitad detrás, mitad delante) y destellos dorados.
 */

const CUERPO = "M160 236 C 128 330, 96 470, 112 590 C 122 646, 220 668, 300 668 C 380 668, 478 646, 488 590 C 504 470, 472 330, 440 236 Z";
const BORDE = "M128 196 C 200 168, 400 168, 472 196 C 486 214, 480 244, 462 258 C 400 236, 200 236, 138 258 C 120 244, 114 214, 128 196 Z";
const PLIEGUES = ["M200 300 C 190 400, 182 500, 190 620", "M300 300 C 302 420, 300 520, 304 650", "M398 300 C 410 400, 420 500, 410 620"];

const BOCA = (() => {
  const r = azar(17);
  return Array.from({ length: 26 }, () => ({ x: 170 + r() * 260, y: 186 + r() * 30, r: r() * 360, s: 0.85 + r() * 0.3 }));
})();

const CAIDA = [
  { x: 270, d: 0, r: 120 },
  { x: 310, d: 0.33, r: -150 },
  { x: 290, d: 0.66, r: 200 },
  { x: 330, d: 0.15, r: -90 },
  { x: 255, d: 0.5, r: 160 },
  { x: 300, d: 0.83, r: -200 },
  { x: 345, d: 0.4, r: 140 },
];

const DESTELLOS: Array<[number, number, number]> = [
  [40, 210, 22],
  [70, 470, 26],
  [540, 300, 18],
  [520, 560, 16],
  [110, 110, 14],
  [480, 120, 12],
];

export function EscenaEmpaque({ p }: { p: MotionValue<number> }) {
  const opacidad = useTransform(p, [0.59, 0.65, 0.81, 0.86], [0, 1, 1, 0]);
  const y = useTransform(p, (v) => 120 * (1 - suave(seg(v, 0.59, 0.68))));
  const escala = useTransform(p, (v) => 0.86 + 0.14 * suave(seg(v, 0.59, 0.68)) - 0.08 * seg(v, 0.8, 0.86));
  const giro = useTransform(p, (v) => -1400 * seg(v, 0.6, 0.82));
  const flujo = useTransform(p, (v) => seg(v, 0.61, 0.79));
  const qr = useMemo(() => encodeQr("https://orivia.co/ficha/CAC001"), []);

  return (
    <motion.svg
      viewBox="0 0 600 720"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 size-full"
      style={{ opacity: opacidad, y, scale: escala }}
      role="img"
      aria-label="Saco de fique ORIVIA con código QR y huella SHA-256 recibiendo granos de cacao secos"
    >
      {/* Anillo: mitad trasera */}
      <Anillo giro={giro} mitad="atras" />

      {/* Sombra */}
      <ellipse cx="300" cy="676" rx="210" ry="24" fill="#000" opacity="0.55" filter="url(#orv-sombra)" />

      {/* Saco */}
      <g filter="url(#orv-fique)">
        <path d={CUERPO} fill="url(#orv-tejido)" />
        <path d={BORDE} fill="url(#orv-tejido)" />
      </g>
      <path d={CUERPO} fill="url(#orv-saco)" />
      {PLIEGUES.map((d) => (
        <path key={d} d={d} fill="none" stroke="#5a4022" strokeOpacity="0.28" strokeWidth="10" filter="url(#orv-difuso)" />
      ))}
      <path d={BORDE} fill="url(#orv-saco)" opacity="0.7" />
      <path d="M140 250 C 200 230, 400 230, 460 250" fill="none" stroke="#3d2a14" strokeOpacity="0.45" strokeWidth="4" />

      {/* Boca con granos */}
      <ellipse cx="300" cy="200" rx="150" ry="26" fill="#2a1c0e" />
      <g clipPath="url(#orv-boca)">
        {BOCA.map((b, i) => (
          <use key={i} href="#orv-g-seco" transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(0)}) scale(${b.s.toFixed(2)})`} />
        ))}
      </g>
      <clipPath id="orv-boca">
        <ellipse cx="300" cy="206" rx="150" ry="34" />
      </clipPath>

      {/* Estampado: isotipo, palabra, SHA-256 y sello QR */}
      <g opacity="0.82" style={{ mixBlendMode: "multiply" }}>
        <path d="M218 372 C 232 344, 246 324, 262 322 C 276 320, 292 344, 306 372" fill="none" stroke="#33220f" strokeWidth="7" strokeLinecap="round" />
        <path d="M240 360 L250 350 L256 355 L264 345 L278 360" fill="none" stroke="#33220f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="262" cy="420" rx="40" ry="44" fill="#33220f" />
        <path d="M268 380 C 252 398, 250 420, 258 436 C 264 448, 262 458, 256 466" fill="none" stroke="#c5a272" strokeWidth="5" strokeLinecap="round" />
        <text x="262" y="512" textAnchor="middle" fontFamily="var(--font-montserrat), sans-serif" fontSize="48" fontWeight="500" letterSpacing="6" fill="#33220f">
          ORIVIA
        </text>
        <text x="262" y="550" textAnchor="middle" fontFamily="var(--font-montserrat), sans-serif" fontSize="22" fontWeight="700" letterSpacing="2" fill="#33220f">
          SHA-256
        </text>
        <g transform="translate(330 352)">
          <rect x="-6" y="-6" width="98" height="98" fill="none" stroke="#33220f" strokeWidth="3" strokeDasharray="5 3" />
          {qr.map((fila, yy) =>
            fila.map((on, xx) => (on ? <rect key={`${xx}-${yy}`} x={(xx * 86) / qr.length} y={(yy * 86) / qr.length} width={86 / qr.length + 0.2} height={86 / qr.length + 0.2} fill="#33220f" /> : null)),
          )}
          <text x="43" y="106" textAnchor="middle" fontFamily="var(--font-geist-mono), monospace" fontSize="8" fill="#33220f">
            LOTE CAC001
          </text>
        </g>
      </g>

      {/* Granos secos cayendo dentro del saco */}
      {CAIDA.map((c, i) => (
        <GranoCae key={i} flujo={flujo} c={c} />
      ))}

      {/* Anillo: mitad delantera */}
      <Anillo giro={giro} mitad="adelante" />

      {/* Destellos */}
      {DESTELLOS.map(([x, yy, s], i) => (
        <g key={i} transform={`translate(${x} ${yy}) scale(${s / 20})`}>
          <path
            d="M0 -10 C 1 -3, 3 -1, 10 0 C 3 1, 1 3, 0 10 C -1 3, -3 1, -10 0 C -3 -1, -1 -3, 0 -10 Z"
            fill="#f6e3b0"
            className="[animation:destello_2.8s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:center]"
            style={{ animationDelay: `${-i * 0.6}s`, filter: "drop-shadow(0 0 4px rgba(246,227,176,0.9))" }}
          />
        </g>
      ))}
    </motion.svg>
  );
}

function GranoCae({ flujo, c }: { flujo: MotionValue<number>; c: { x: number; d: number; r: number } }) {
  // Cada grano repite su caída tres veces durante la etapa: flujo continuo y reversible.
  const t = useTransform(flujo, (v) => (v <= 0 ? 0 : (((v * 3 + c.d) % 1) + 1) % 1));
  const y = useTransform(t, (k) => -60 + 260 * k * k);
  const rotate = useTransform(t, (k) => c.r * k);
  const opacity = useTransform([flujo, t] as const, ([f, k]: number[]) => (f <= 0 || f >= 1 ? 0 : k < 0.08 ? k / 0.08 : k > 0.9 ? (1 - k) / 0.1 : 1));
  return (
    <motion.g style={{ x: c.x, y, rotate, opacity }}>
      <use href="#orv-g-seco" transform="scale(1.1)" />
    </motion.g>
  );
}

function Anillo({ giro, mitad }: { giro: MotionValue<number>; mitad: "atras" | "adelante" }) {
  const id = `orv-anillo-${mitad}`;
  return (
    <g>
      <clipPath id={id}>{mitad === "atras" ? <rect x="-50" y="0" width="700" height="430" /> : <rect x="-50" y="430" width="700" height="400" />}</clipPath>
      <g clipPath={`url(#${id})`} opacity={mitad === "atras" ? 0.5 : 1} style={{ filter: "drop-shadow(0 0 6px rgba(246,227,176,0.8))" }}>
        <ellipse cx="300" cy="430" rx="290" ry="74" fill="none" stroke="#f6e3b0" strokeOpacity="0.14" strokeWidth="1.2" />
        <motion.ellipse cx="300" cy="430" rx="290" ry="74" fill="none" stroke="url(#orv-anillo)" strokeWidth="2.6" strokeDasharray="700 600" style={{ strokeDashoffset: giro }} />
      </g>
    </g>
  );
}
