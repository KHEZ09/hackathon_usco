"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

interface RealisticDragonflyProps {
  className?: string;
  wingSpeed?: number;
  glow?: boolean;
}

/**
 * Libélula hiperrealista con el estilo fotográfico del inicio de Orivia:
 * - Ojos facetados verde esmeralda con destellos de luz solar.
 * - Tórax metálico con textura irisada bosque/oliva y suturas.
 * - Abdomen segmentado azul zafiro/turquesa con anillos articulares en 3D.
 * - Patas anatómicas articuladas con espinas.
 * - 4 alas independientes con venación fina, pterostigma y aleteo de alta frecuencia en antifase.
 */
export function RealisticDragonfly({
  className,
  wingSpeed = 0.055,
  glow = true,
}: RealisticDragonflyProps) {
  const id = useId();
  const reduce = useReducedMotion();

  // Aleteo rápido de alas con torsión y variación angular realista
  const frontWingAnim = reduce
    ? undefined
    : {
        rotateX: [0, -55, 35, 0],
        rotateZ: [0, 8, -4, 0],
        scaleY: [1, 0.45, 0.85, 1],
        opacity: [0.85, 0.65, 0.9, 0.85],
        transition: {
          duration: wingSpeed,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  const backWingAnim = reduce
    ? undefined
    : {
        rotateX: [30, -45, 15, 30],
        rotateZ: [-3, 6, -6, -3],
        scaleY: [0.75, 0.5, 0.95, 0.75],
        opacity: [0.75, 0.6, 0.85, 0.75],
        transition: {
          duration: wingSpeed,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: wingSpeed * 0.35,
        },
      };

  return (
    <div
      className={cn(
        "relative select-none pointer-events-none transform-gpu",
        glow && "drop-shadow-[0_8px_20px_rgba(15,45,30,0.55)]",
        className,
      )}
      style={{ perspective: 800 }}
    >
      <svg
        viewBox="0 0 320 180"
        className="w-full h-auto overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Brillo iridiscente de alas: luz solar dorada + cielo azul */}
          <linearGradient id={`${id}-wing-sheen`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="25%" stopColor="#dff5ee" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#a8e0ea" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#f7e4c1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.65" />
          </linearGradient>

          {/* Patrón de celdillas y nervaduras de las alas */}
          <pattern
            id={`${id}-veins`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(32)"
          >
            <path
              d="M0 0 L6 0 M0 0 L0 6 M0 3 L6 3 M3 0 L3 6"
              stroke="#2a4537"
              strokeWidth="0.35"
              strokeOpacity="0.38"
            />
          </pattern>

          {/* Ojos esmeralda fotográficos */}
          <radialGradient id={`${id}-eye`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#c3fa70" />
            <stop offset="35%" stopColor="#38d973" />
            <stop offset="70%" stopColor="#1b8546" />
            <stop offset="100%" stopColor="#082b18" />
          </radialGradient>

          {/* Reflejo especular del ojo */}
          <linearGradient id={`${id}-eye-shine`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Tórax verde metálico oliva/bosque */}
          <linearGradient id={`${id}-thorax`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6dc786" />
            <stop offset="40%" stopColor="#2c7847" />
            <stop offset="80%" stopColor="#1a472c" />
            <stop offset="100%" stopColor="#0b2214" />
          </linearGradient>

          {/* Abdomen zafiro / turquesa brillante */}
          <linearGradient id={`${id}-abd`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a5578" />
            <stop offset="30%" stopColor="#2b9eb3" />
            <stop offset="70%" stopColor="#48cae4" />
            <stop offset="100%" stopColor="#1d638a" />
          </linearGradient>

          {/* Brillo dorsal del abdomen */}
          <linearGradient id={`${id}-abd-light`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#90e0ef" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0077b6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#03045e" stopOpacity="0.9" />
          </linearGradient>

          {/* Pterostigma (marca oscura/dorada en la punta del ala) */}
          <linearGradient id={`${id}-pterostigma`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#432818" />
            <stop offset="100%" stopColor="#99582a" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* PAR DE ALAS TRASERAS (POSTERIORES)                             */}
        {/* ============================================================== */}
        <motion.g
          style={{ originX: "205px", originY: "84px", transformStyle: "preserve-3d" }}
          animate={backWingAnim}
        >
          {/* Ala posterior izquierda (atrás) */}
          <g transform="rotate(-14 205 84)">
            <path
              d="M205 84 C 180 50, 105 18, 55 35 C 42 42, 60 70, 95 82 C 145 96, 185 88, 205 84 Z"
              fill={`url(#${id}-wing-sheen)`}
              stroke="#406852"
              strokeWidth="0.75"
              strokeOpacity="0.65"
            />
            <path
              d="M205 84 C 180 50, 105 18, 55 35 C 42 42, 60 70, 95 82 C 145 96, 185 88, 205 84 Z"
              fill={`url(#${id}-veins)`}
            />
            <path
              d="M205 84 C 170 54, 110 28, 56 36"
              stroke="#2c4d3b"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <rect
              x="70"
              y="32"
              width="14"
              height="2.6"
              rx="0.8"
              transform="rotate(11 70 32)"
              fill={`url(#${id}-pterostigma)`}
              opacity="0.85"
            />
          </g>

          {/* Ala posterior derecha (primer plano inferior) */}
          <g transform="rotate(8 205 84)">
            <path
              d="M205 84 C 175 110, 100 132, 58 118 C 45 110, 68 88, 105 82 C 150 75, 185 82, 205 84 Z"
              fill={`url(#${id}-wing-sheen)`}
              stroke="#406852"
              strokeWidth="0.75"
              strokeOpacity="0.65"
            />
            <path
              d="M205 84 C 175 110, 100 132, 58 118 C 45 110, 68 88, 105 82 C 150 75, 185 82, 205 84 Z"
              fill={`url(#${id}-veins)`}
            />
            <path
              d="M205 84 C 165 106, 105 125, 59 117"
              stroke="#2c4d3b"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <rect
              x="72"
              y="118"
              width="14"
              height="2.6"
              rx="0.8"
              transform="rotate(-9 72 118)"
              fill={`url(#${id}-pterostigma)`}
              opacity="0.85"
            />
          </g>
        </motion.g>

        {/* ============================================================== */}
        {/* ABDOMEN LARGO SEGMENTADO (AZUL TURQUESA / ZAFIRO)             */}
        {/* ============================================================== */}
        <g id="abdomen">
          <path
            d="M202 88 C 160 88, 70 94, 18 97 C 12 97.5, 12 99.5, 18 100 C 70 98, 160 92, 202 91 Z"
            fill="#031522"
            opacity="0.5"
          />
          <path
            d="M202 87 C 160 87, 70 92, 16 95 C 10 95.8, 10 98.2, 16 98.8 C 70 96, 160 91, 202 90 Z"
            fill={`url(#${id}-abd)`}
          />
          <path
            d="M202 87 C 160 87, 70 92, 16 95 C 10 95.8, 10 98.2, 16 98.8 C 70 96, 160 91, 202 90 Z"
            fill={`url(#${id}-abd-light)`}
            opacity="0.7"
          />

          {[32, 50, 68, 86, 104, 122, 140, 158, 176, 192].map((x, idx) => {
            const yTop = 87 + (1 - x / 202) * 8;
            return (
              <g key={x}>
                <line
                  x1={x}
                  y1={yTop}
                  x2={x + 1}
                  y2={yTop + 5.2 - (idx > 6 ? 1 : 0)}
                  stroke="#082032"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle
                  cx={x + 0.5}
                  cy={yTop + 0.8}
                  r="0.8"
                  fill="#90e0ef"
                  opacity="0.85"
                />
              </g>
            );
          })}

          <path
            d="M16 95.5 L8 94.5 C 5 94, 4 95, 6 96 L15 97"
            stroke="#0b2538"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M16 98 L8 99 C 5 99.5, 4 98.5, 6 97.5 L15 97"
            stroke="#0b2538"
            strokeWidth="1.2"
            fill="none"
          />
        </g>

        {/* ============================================================== */}
        {/* TÓRAX Y PATAS ARTICULADAS                                      */}
        {/* ============================================================== */}
        <g id="torax-y-patas">
          <g
            stroke="#162e20"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M228 95 L234 112 L244 125 L247 124" />
            <path d="M218 96 L220 116 L228 132 L233 133" />
            <path d="M208 95 L202 114 L208 129 L213 130" />
          </g>

          <g stroke="#264e37" strokeWidth="0.8" strokeLinecap="round">
            <line x1="238" y1="118" x2="241" y2="119" />
            <line x1="241" y1="121" x2="244" y2="122" />
            <line x1="223" y1="121" x2="226" y2="123" />
            <line x1="225" y1="125" x2="228" y2="127" />
          </g>

          <ellipse
            cx="218"
            cy="88"
            rx="18"
            ry="11"
            transform="rotate(-8 218 88)"
            fill={`url(#${id}-thorax)`}
          />
          <ellipse
            cx="216"
            cy="84"
            rx="11"
            ry="4.5"
            transform="rotate(-12 216 84)"
            fill="#7ee09e"
            opacity="0.45"
          />
          <path
            d="M210 82 Q 216 88 214 96"
            stroke="#0b2416"
            strokeWidth="1.4"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M222 80 Q 227 86 226 95"
            stroke="#0b2416"
            strokeWidth="1.4"
            fill="none"
            opacity="0.7"
          />
        </g>

        {/* ============================================================== */}
        {/* CABEZA Y OJOS COMPUESTOS ESMERALDA                             */}
        {/* ============================================================== */}
        <g id="cabeza">
          <ellipse cx="239" cy="85" rx="7" ry="8" fill="#1b4d2e" />
          <circle cx="244" cy="83" r="10.5" fill={`url(#${id}-eye)`} />
          <circle
            cx="244"
            cy="83"
            r="10.5"
            fill="none"
            stroke="#e9fded"
            strokeWidth="0.6"
            opacity="0.4"
          />
          <ellipse
            cx="246"
            cy="80"
            rx="3.8"
            ry="2.4"
            transform="rotate(-25 246 80)"
            fill={`url(#${id}-eye-shine)`}
          />
          <circle cx="243" cy="78" r="1.2" fill="#ffffff" opacity="0.95" />
          <path
            d="M245 92 Q 248 97 245 99 L 242 98"
            stroke="#153620"
            strokeWidth="1.4"
            fill="#2c5e3b"
          />
        </g>

        {/* ============================================================== */}
        {/* PAR DE ALAS DELANTERAS (ANTERIORES)                            */}
        {/* ============================================================== */}
        <motion.g
          style={{ originX: "220px", originY: "82px", transformStyle: "preserve-3d" }}
          animate={frontWingAnim}
        >
          <g transform="rotate(-32 220 82)">
            <path
              d="M220 82 C 205 38, 140 -8, 86 6 C 72 10, 88 42, 122 58 C 172 80, 204 80, 220 82 Z"
              fill={`url(#${id}-wing-sheen)`}
              stroke="#386b50"
              strokeWidth="0.85"
              strokeOpacity="0.75"
            />
            <path
              d="M220 82 C 205 38, 140 -8, 86 6 C 72 10, 88 42, 122 58 C 172 80, 204 80, 220 82 Z"
              fill={`url(#${id}-veins)`}
            />
            <path
              d="M220 82 C 185 36, 130 5, 87 7"
              stroke="#214230"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <rect
              x="102"
              y="5"
              width="15"
              height="2.8"
              rx="0.8"
              transform="rotate(13 102 5)"
              fill={`url(#${id}-pterostigma)`}
              opacity="0.9"
            />
          </g>

          <g transform="rotate(-6 220 82)">
            <path
              d="M220 82 C 195 56, 125 32, 70 48 C 55 54, 76 80, 114 88 C 168 96, 202 86, 220 82 Z"
              fill={`url(#${id}-wing-sheen)`}
              stroke="#386b50"
              strokeWidth="0.85"
              strokeOpacity="0.75"
            />
            <path
              d="M220 82 C 195 56, 125 32, 70 48 C 55 54, 76 80, 114 88 C 168 96, 202 86, 220 82 Z"
              fill={`url(#${id}-veins)`}
            />
            <path
              d="M220 82 C 180 56, 120 40, 71 49"
              stroke="#214230"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <rect
              x="88"
              y="45"
              width="15"
              height="2.8"
              rx="0.8"
              transform="rotate(7 88 45)"
              fill={`url(#${id}-pterostigma)`}
              opacity="0.9"
            />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}
