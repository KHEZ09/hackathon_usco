"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { azar, bilineal, seg, suave } from "./geometria";

/*
 * Escena "secado": bandeja de madera con malla vista en perspectiva, cientos de granos y una
 * ola que los vuelve de blancos (fermentados) a cafés (secos) con el scroll.
 */

const EXT = { tl: [150, 150] as [number, number], tr: [930, 128] as [number, number], br: [1090, 600] as [number, number], bl: [-90, 660] as [number, number] };
const INT = { tl: [190, 182] as [number, number], tr: [900, 162] as [number, number], br: [1040, 572] as [number, number], bl: [-40, 625] as [number, number] };
const pts = (q: typeof EXT) => [q.tl, q.tr, q.br, q.bl].map((p) => p.join(",")).join(" ");

const GRANOS = (() => {
  const r = azar(33);
  const out: Array<{ x: number; y: number; r: number; s: number }> = [];
  const filas = 13;
  const cols = 22;
  for (let j = 0; j < filas; j++) {
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5 + (r() - 0.5) * 0.7) / cols;
      const v = (j + 0.5 + (r() - 0.5) * 0.6) / filas;
      const [x, y] = bilineal(INT, u, v);
      out.push({ x, y, r: r() * 360, s: 0.7 + v * 0.95 });
    }
  }
  return out.sort((a, b) => a.y - b.y);
})();

const BOKEH = (() => {
  const r = azar(5);
  return Array.from({ length: 16 }, () => ({ x: r() * 1000, y: r() * 200, rad: 20 + r() * 60, c: r() > 0.6 ? "#d9c27a" : "#4d7a3b", o: 0.15 + r() * 0.3 }));
})();

export function EscenaSecado({ p }: { p: MotionValue<number> }) {
  const opacidad = useTransform(p, [0.38, 0.45, 0.6, 0.67], [0, 1, 1, 0]);
  const escala = useTransform(p, (v) => 1.35 - 0.3 * suave(seg(v, 0.38, 0.62)));
  const x = useTransform(p, (v) => 50 - 70 * suave(seg(v, 0.38, 0.62)));
  const y = useTransform(p, (v) => 30 - 50 * suave(seg(v, 0.38, 0.62)));
  // Frente de secado: avanza en diagonal desde la esquina cercana hacia el fondo.
  const ola = useTransform(p, (v) => -900 + 2100 * seg(v, 0.43, 0.6));
  const rayos = useTransform(p, (v) => -40 + 120 * seg(v, 0.38, 0.66));
  const hojasY = useTransform(p, (v) => 120 - 260 * seg(v, 0.38, 0.66));

  return (
    <motion.div style={{ opacity: opacidad }} className="absolute inset-0 overflow-hidden">
      <motion.svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        style={{ scale: escala, x, y }}
        role="img"
        aria-label="Bandeja de secado al sol donde los granos de cacao pasan de blancos a cafés"
      >
        <defs>
          <linearGradient id="orv-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6b3c" />
            <stop offset="0.5" stopColor="#2c3a20" />
            <stop offset="1" stopColor="#141a10" />
          </linearGradient>
          <pattern id="orv-malla" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
            <rect width="9" height="9" fill="#2b241b" />
            <path d="M0 0 H9 M0 0 V9" stroke="#6b5c46" strokeWidth="1.2" />
          </pattern>
          <linearGradient id="orv-ola" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.46" stopColor="#fff" />
            <stop offset="0.54" stopColor="#000" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id="orv-mascara-seco" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="1000">
            <motion.rect x="-1200" y="-600" width="2400" height="2000" fill="url(#orv-ola)" style={{ x: ola, rotate: -32, originX: "1200px", originY: "1000px" }} />
          </mask>
        </defs>

        {/* Fondo: cacaotal desenfocado */}
        <rect x="-100" y="-100" width="1200" height="800" fill="url(#orv-cielo)" />
        <g filter="url(#orv-sombra)">
          {BOKEH.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={b.rad} fill={b.c} opacity={b.o} />
          ))}
        </g>

        {/* Bandeja */}
        <polygon points={pts(EXT)} fill="url(#orv-madera-clara)" filter="url(#orv-madera)" />
        <polygon points={pts(INT)} fill="url(#orv-malla)" />
        <polyline points={[EXT.bl, EXT.tl, EXT.tr].map((q) => q.join(",")).join(" ")} fill="none" stroke="#e4b47d" strokeWidth="6" strokeLinejoin="round" opacity="0.8" />

        {/* Granos fermentados (blancos) y su versión seca (café) revelada por la ola */}
        <g>
          {GRANOS.map((g, i) => (
            <use key={i} href="#orv-g-fresco" transform={`translate(${g.x.toFixed(1)} ${g.y.toFixed(1)}) rotate(${g.r.toFixed(0)}) scale(${g.s.toFixed(2)})`} />
          ))}
        </g>
        <g mask="url(#orv-mascara-seco)">
          {GRANOS.map((g, i) => (
            <use key={i} href="#orv-g-seco" transform={`translate(${g.x.toFixed(1)} ${g.y.toFixed(1)}) rotate(${g.r.toFixed(0)}) scale(${g.s.toFixed(2)})`} />
          ))}
        </g>

        {/* Haces de sol */}
        <motion.g style={{ x: rayos }} opacity="0.5" filter="url(#orv-sombra)">
          <polygon points="620,-60 700,-60 420,700 300,700" fill="#f6e3b0" opacity="0.35" />
          <polygon points="760,-60 800,-60 600,700 540,700" fill="#f6e3b0" opacity="0.25" />
        </motion.g>

        {/* Hojas en primer plano, desenfocadas */}
        <motion.g style={{ y: hojasY }} filter="url(#orv-difuso)" opacity="0.85">
          <path d="M1010 40 C 900 60, 840 130, 830 220 C 900 190, 980 130, 1010 40 Z" fill="url(#orv-hoja)" />
          <path d="M-20 520 C 60 470, 170 480, 230 560 C 140 590, 40 580, -20 520 Z" fill="url(#orv-hoja)" />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
}
