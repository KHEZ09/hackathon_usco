"use client";

import { useMemo } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { azar, curva, seg, suave } from "./geometria";

/*
 * Escena "beneficio" (cosecha + fermentación) en un solo mundo SVG de 1000 × 1100.
 * La cámara empieza en la rama con la mazorca y baja hasta el cajón de fermentación.
 * Todo depende del progreso del scroll `p` (0→1 de la sección), así que es reversible.
 */

// ── Mazorca (espacio local: eje en x=180, pedúnculo en y=92, punta en y=505) ──
const TOP = 92;
const BOT = 505;
const semiAncho = (y: number) => {
  const t = Math.min(1, Math.max(0, (y - TOP) / (BOT - TOP)));
  return 114 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.62);
};
const ys = Array.from({ length: 70 }, (_, i) => TOP + ((BOT - TOP) * i) / 69);
const borde = (lado: 1 | -1, f = 1) => ys.map((y) => [180 + lado * f * semiAncho(y), y] as [number, number]);
const costura: Array<[number, number]> = ys.map((y) => [180 + Math.sin(((y - TOP) / (BOT - TOP)) * Math.PI * 1.4) * 4, y]);

const mitad = (lado: 1 | -1) => {
  const ext = borde(lado);
  const pts = [...ext, ...[...costura].reverse()];
  return curva(pts, true);
};
const MITAD_IZQ = mitad(-1);
const MITAD_DER = mitad(1);
const CARNE = curva([...borde(-1, 0.8), ...[...borde(1, 0.8)].reverse()], true);
const surcos = (lado: 1 | -1) => [0.24, 0.48, 0.7, 0.88].map((f) => curva(borde(lado, f).slice(3, -3)));

// Columna de granos dentro de la mazorca
const COLUMNA = Array.from({ length: 20 }, (_, i) => {
  const col = i % 2;
  const fila = Math.floor(i / 2);
  return { x: col ? 194 : 166, y: 158 + fila * 30 + (col ? 14 : 0), r: col ? 8 : -8 };
});

// ── Cajón de fermentación (espacio mundo) ──
const CAJON = {
  fl: [292, 848] as [number, number],
  fr: [652, 880] as [number, number],
  br: [770, 812] as [number, number],
  bl: [408, 788] as [number, number],
  alto: 175,
};
const poly = (pts: Array<[number, number]>) => pts.map((p) => p.join(",")).join(" ");

// Pila de granos fermentados (cafés) y destino de cada grano fresco que cae
const PILA = (() => {
  const r = azar(7);
  return Array.from({ length: 46 }, () => {
    const u = 0.08 + r() * 0.84;
    const v = 0.15 + r() * 0.75;
    const x = CAJON.fl[0] + (CAJON.fr[0] - CAJON.fl[0]) * u + (CAJON.bl[0] - CAJON.fl[0]) * v;
    const y = CAJON.fl[1] + (CAJON.fr[1] - CAJON.fl[1]) * u + (CAJON.bl[1] - CAJON.fl[1]) * v + 38;
    return { x, y, r: r() * 180, s: 0.8 + r() * 0.3 };
  });
})();
const DESTINOS = (() => {
  const r = azar(21);
  return COLUMNA.map(() => ({ x: 470 + r() * 120, y: 846 + r() * 26, r: r() * 360 - 180 }));
})();

// ── Rama y hojas ──
const RAMA = "M120 250 C 250 190, 380 130, 492 92 C 610 55, 760 18, 1080 -30";
const HOJAS: Array<{ x: number; y: number; l: number; a: number; o: number }> = [
  { x: 560, y: 70, l: 300, a: -12, o: 1 },
  { x: 610, y: 60, l: 260, a: 28, o: 0.95 },
  { x: 700, y: 30, l: 280, a: -38, o: 0.9 },
  { x: 400, y: 128, l: 240, a: 155, o: 0.9 },
  { x: 300, y: 172, l: 230, a: 205, o: 0.85 },
  { x: 820, y: 0, l: 260, a: 12, o: 0.8 },
];
function Hoja({ x, y, l, a, o }: { x: number; y: number; l: number; a: number; o: number }) {
  const w = l * 0.24;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`} opacity={o}>
      <path d={`M0 0 C ${l * 0.22} ${-w}, ${l * 0.72} ${-w * 1.05}, ${l} 0 C ${l * 0.72} ${w * 1.05}, ${l * 0.22} ${w}, 0 0 Z`} fill="url(#orv-hoja)" />
      <path d={`M2 0 C ${l * 0.35} -2, ${l * 0.7} -2, ${l - 4} 0`} fill="none" stroke="#a7cf86" strokeOpacity="0.7" strokeWidth="1.6" />
      {[0.18, 0.32, 0.46, 0.6, 0.74].map((f) => (
        <g key={f} fill="none" stroke="#a7cf86" strokeOpacity="0.35" strokeWidth="1">
          <path d={`M${l * f} -1 Q ${l * (f + 0.06)} ${-w * 0.45}, ${l * (f + 0.12)} ${-w * 0.78}`} />
          <path d={`M${l * f} 1 Q ${l * (f + 0.06)} ${w * 0.45}, ${l * (f + 0.12)} ${w * 0.78}`} />
        </g>
      ))}
      <path d={`M${l * 0.15} ${-w * 0.4} C ${l * 0.4} ${-w * 0.85}, ${l * 0.65} ${-w * 0.8}, ${l * 0.85} ${-w * 0.25}`} fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth={w * 0.25} strokeLinecap="round" />
    </g>
  );
}

export function EscenaBeneficio({ p }: { p: MotionValue<number> }) {
  // Cámara: de la rama al cajón y luego "atraviesa" el cajón hacia el secado.
  const camY = useTransform(p, (v) => -330 * suave(seg(v, 0.2, 0.28)));
  const zoom = useTransform(p, (v) => 1 + 0.45 * suave(seg(v, 0.38, 0.45)));
  const opacidad = useTransform(p, [0, 0.03, 0.39, 0.45], [0, 1, 1, 0]);
  const entrada = useTransform(p, (v) => 50 * (1 - suave(seg(v, 0, 0.06))));

  // Mazorca: se abre (cosecha) y luego sus mitades se separan como copas (fermentación)
  const abre = useTransform(p, (v) => suave(seg(v, 0.1, 0.2)));
  const copa = useTransform(p, (v) => suave(seg(v, 0.2, 0.27)));
  const izqX = useTransform([abre, copa], ([a, c]: number[]) => -24 * a - 46 * c);
  const derX = useTransform([abre, copa], ([a, c]: number[]) => 24 * a + 46 * c);
  const izqR = useTransform([abre, copa], ([a, c]: number[]) => -11 * a - 52 * c);
  const derR = useTransform([abre, copa], ([a, c]: number[]) => 11 * a + 52 * c);
  const podY = useTransform(copa, (c) => 180 * c);
  const podS = useTransform(copa, (c) => 1 - 0.15 * c);
  const borde = useTransform(abre, [0, 0.4], [0, 1]);
  const vaiven = useTransform(p, (v) => Math.sin(v * 40) * 2 * (1 - seg(v, 0.08, 0.14)));
  const rama = useTransform(p, [0.2, 0.26], [1, 0]);
  const vapor = useTransform(p, [0.26, 0.3, 0.38, 0.42], [0, 1, 1, 0]);

  return (
    <motion.svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      style={{ opacity: opacidad, scale: zoom }}
      role="img"
      aria-label="Mazorca de cacao en la rama que se abre y deja caer sus granos frescos en un cajón de fermentación"
    >
      <motion.g style={{ y: camY }}>
        <motion.g style={{ y: entrada }}>
          {/* Rama y hojas */}
          <motion.g style={{ opacity: rama }}>
            <path d={RAMA} fill="none" stroke="url(#orv-corteza)" strokeWidth="26" strokeLinecap="round" />
            <path d={RAMA} fill="none" stroke="#b6a07a" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" transform="translate(0 -7)" />
            {[180, 300, 420, 640, 780].map((x, i) => (
              <ellipse key={x} cx={x} cy={250 - x * 0.27 + (i % 2 ? 4 : -4)} rx="9" ry="4" fill="#9fb59a" opacity="0.4" />
            ))}
            {HOJAS.map((h, i) => (
              <Hoja key={i} {...h} />
            ))}
          </motion.g>

          {/* Mazorca */}
          <g transform="translate(320 0)">
            <motion.g style={{ y: podY, scale: podS, rotate: vaiven, originX: "180px", originY: "60px" }}>
              <path d="M180 94 C 178 78, 176 66, 172 50" fill="none" stroke="#6b5a3e" strokeWidth="11" strokeLinecap="round" />
              <ellipse cx="180" cy="96" rx="16" ry="8" fill="#7a6342" />

              {/* Interior: carne y columna de granos */}
              <path d={CARNE} fill="url(#orv-pulpa)" />
              {COLUMNA.map((g, i) => (
                <GranoColumna key={i} p={p} i={i} g={g} />
              ))}

              {/* Mitades */}
              {(
                [
                  [MITAD_IZQ, izqX, izqR, -1],
                  [MITAD_DER, derX, derR, 1],
                ] as const
              ).map(([d, x, r, lado]) => (
                <motion.g key={lado} style={{ x, rotate: r, originX: "180px", originY: "96px" }}>
                  <g filter="url(#orv-rugosa)">
                    <path d={d} fill="url(#orv-mazorca)" />
                    {surcos(lado).map((s) => (
                      <path key={s} d={s} fill="none" stroke="#5e0f12" strokeOpacity="0.5" strokeWidth="7" strokeLinecap="round" />
                    ))}
                    {surcos(lado).map((s) => (
                      <path key={`l${s}`} d={s} fill="none" stroke="#ffd9a0" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" transform={`translate(${lado * 6} 0)`} />
                    ))}
                  </g>
                  <path d={d} fill="url(#orv-mazorca-sombra)" />
                  {/* Borde amarillo del corte, visible al abrirse */}
                  <motion.path d={curva(costura)} fill="none" stroke="#f2b544" strokeWidth="9" strokeLinecap="round" style={{ opacity: borde }} />
                </motion.g>
              ))}
            </motion.g>
          </g>

          {/* Cajón de fermentación */}
          <Cajon p={p} vapor={vapor} />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

/** Grano de la columna: se ve dentro de la mazorca hasta que se suelta y cae al cajón. */
function GranoColumna({ p, i, g }: { p: MotionValue<number>; i: number; g: { x: number; y: number; r: number } }) {
  const inicio = 0.255 + i * 0.0055;
  const visible = useTransform(p, (v) => (v < inicio ? 1 : 0));
  return (
    <motion.g style={{ opacity: visible }}>
      <use href="#orv-g-fresco" transform={`translate(${g.x} ${g.y}) rotate(${g.r}) scale(1.2)`} />
    </motion.g>
  );
}

/** Grano que cae con gravedad desde la mazorca abierta hasta su lugar en la pila. */
function GranoCae({ p, i }: { p: MotionValue<number>; i: number }) {
  const g = COLUMNA[i];
  const d = DESTINOS[i];
  // Posición del grano en el mundo cuando la mazorca ya bajó (copa = 1)
  const x0 = 320 + 180 + (g.x - 180) * 0.85;
  const y0 = 60 + (g.y - 60) * 0.85 + 180;
  const inicio = 0.255 + i * 0.0055;
  const t = useTransform(p, (v) => seg(v, inicio, inicio + 0.045));
  const x = useTransform(t, (k) => x0 + (d.x - x0) * k);
  const y = useTransform(t, (k) => y0 + (d.y - y0) * k * k); // caída acelerada
  const rotate = useTransform(t, (k) => g.r + (d.r - g.r) * k);
  const scale = useTransform(t, (k) => 1.2 - 0.25 * k);
  const opacity = useTransform(p, (v) => (v >= inicio ? 1 : 0));
  return (
    <motion.g style={{ opacity, x, y, rotate, scale }}>
      <use href="#orv-g-fresco" />
    </motion.g>
  );
}

function Cajon({ p, vapor }: { p: MotionValue<number>; vapor: MotionValue<number> }) {
  const { fl, fr, br, bl, alto } = CAJON;
  const abajo = (q: [number, number], dy = alto): [number, number] => [q[0] + 6, q[1] + dy];
  const pila = useMemo(() => PILA, []);
  return (
    <g>
      {/* Sombra en el suelo */}
      <ellipse cx="540" cy={fl[1] + alto + 30} rx="300" ry="40" fill="#000" opacity="0.45" filter="url(#orv-sombra)" />
      {/* Paredes interiores */}
      <polygon points={poly([bl, br, abajo(br, 70), abajo(bl, 70)])} fill="url(#orv-madera-interior)" filter="url(#orv-madera)" />
      <polygon points={poly([fl, bl, abajo(bl, 70), abajo(fl, 60)])} fill="#4a301a" filter="url(#orv-madera)" />
      {/* Pila de granos fermentados */}
      {pila.map((b, i) => (
        <use key={i} href="#orv-g-seco" transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(0)}) scale(${b.s.toFixed(2)})`} />
      ))}
      {/* Granos frescos que caen */}
      {COLUMNA.map((_, i) => (
        <GranoCae key={i} p={p} i={i} />
      ))}
      {/* Caras exteriores */}
      <polygon points={poly([fl, fr, abajo(fr), abajo(fl, alto - 12)])} fill="url(#orv-madera-clara)" filter="url(#orv-madera)" />
      <polygon points={poly([fr, br, abajo(br, alto - 30), abajo(fr)])} fill="url(#orv-madera-oscura)" filter="url(#orv-madera)" />
      {/* Unión de tablas y bordes iluminados */}
      <path d={`M${fl[0] + 3} ${fl[1] + 86} L ${fr[0] + 3} ${fr[1] + 88}`} stroke="#5a3a1e" strokeWidth="3" opacity="0.7" />
      <path d={`M${fr[0] + 3} ${fr[1] + 88} L ${br[0] + 3} ${br[1] + 74}`} stroke="#4a2e16" strokeWidth="3" opacity="0.7" />
      <polyline points={poly([fl, fr, br])} fill="none" stroke="#e2b27a" strokeWidth="5" strokeLinejoin="round" opacity="0.85" />
      <polyline points={poly([fl, bl, br])} fill="none" stroke="#b8865a" strokeWidth="4" strokeLinejoin="round" opacity="0.7" />
      <line x1={fr[0]} y1={fr[1]} x2={abajo(fr)[0]} y2={abajo(fr)[1]} stroke="#d9a46c" strokeWidth="3" opacity="0.6" />
      {/* Vapor de la fermentación */}
      <motion.g style={{ opacity: vapor }} filter="url(#orv-difuso)">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse
            key={i}
            cx={430 + i * 60}
            cy={790}
            rx="46"
            ry="60"
            fill="#efe8dc"
            opacity="0.22"
            className="[animation:vapor_6s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:center]"
            style={{ animationDelay: `${-i * 1.2}s` }}
          />
        ))}
      </motion.g>
    </g>
  );
}
