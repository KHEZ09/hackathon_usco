/* eslint-disable @next/next/no-img-element -- capas fotográficas transformadas por el scroll con Framer Motion */
"use client";

import { useSyncExternalStore } from "react";
import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { BadgeCheck, Droplets } from "lucide-react";
import { QrCode } from "@/components/ficha/QrCode";
import { AnilloOrbital, Destellos, GranosCayendo, Vapor } from "./Efectos";

/** Rango de cada etapa dentro del progreso del scroll (0→1). */
export const ETAPAS_RANGO: Array<[number, number]> = [
  [0, 0.2],
  [0.2, 0.4],
  [0.4, 0.6],
  [0.6, 0.8],
  [0.8, 1],
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Progreso local (0→1) de una etapa. */
export function useLocal(p: MotionValue<number>, i: number) {
  const [a, b] = ETAPAS_RANGO[i];
  return useTransform(p, (v) => clamp01((v - a) / (b - a)));
}

/* ── 1. Cosecha: mazorca en la rama que se abre al pasar a fermentación ── */
export function EscenaCosecha({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, [0, 0.24, 0.29], [1, 1, 0]);
  const y = useTransform(p, [0, 0.08], [60, 0]);
  const scale = useTransform(p, [0, 0.08, 0.2, 0.27], [0.86, 1, 1.02, 1.08]);
  const abierta = useTransform(p, [0.13, 0.21], [0, 1]);
  const grieta = useTransform(p, [0.13, 0.17, 0.21], [1, 1.03, 1]);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 grid place-items-center">
      <motion.div style={{ y, scale }} className="relative aspect-[620/857] h-[70%] max-h-[560px]">
        <motion.div style={{ scale: grieta }} className="relative size-full overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-crema/10">
          <img src="/media/proceso/cosecha.jpg" alt="Mazorca de cacao madura en la rama" className="absolute inset-0 size-full object-cover" />
          <motion.img style={{ opacity: abierta }} src="/media/proceso/apertura.jpg" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(246,227,176,0.18),transparent_45%)]" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ── 2. Fermentación: granos frescos caen al cajón con vapor ── */
const CAIDA_FRESCOS = [
  { x: 40, delay: 0, giro: 140, tam: 22 },
  { x: 47, delay: 0.33, giro: -120, tam: 26 },
  { x: 52, delay: 0.66, giro: 200, tam: 20 },
  { x: 44, delay: 0.5, giro: -90, tam: 24 },
  { x: 56, delay: 0.15, giro: 160, tam: 21 },
  { x: 50, delay: 0.85, giro: -180, tam: 23 },
];

export function EscenaFermentacion({ p }: { p: MotionValue<number> }) {
  const local = useLocal(p, 1);
  const opacity = useTransform(p, [0.24, 0.3, 0.38, 0.43], [0, 1, 1, 0]);
  const scale = useTransform(p, [0.24, 0.42], [0.9, 1.03]);
  const y = useTransform(p, [0.24, 0.42], ["4%", "-3%"]);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ scale, y }} className="absolute inset-0 grid place-items-center">
        <div className="relative aspect-[1100/851] h-[92%] max-h-[720px]">
          <img
            src="/media/proceso/fermentacion.jpg"
            alt="Mazorca abierta dejando caer granos frescos en un cajón de fermentación de madera"
            className="absolute inset-0 size-full object-cover [mask-image:radial-gradient(ellipse_70%_72%_at_50%_50%,black_62%,transparent)]"
          />
          <Vapor className="bottom-[30%] left-[22%] h-[40%] w-[56%]" />
          <GranosCayendo progreso={local} granos={CAIDA_FRESCOS} tipo="fresco" desde="38vh" hasta="58vh" className="left-[-6%] w-full" />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 3. Secado: la cámara recorre la bandeja mientras baja la humedad ── */
export function EscenaSecado({ p }: { p: MotionValue<number> }) {
  const local = useLocal(p, 2);
  const opacity = useTransform(p, [0.39, 0.45, 0.6, 0.66], [0, 1, 1, 0]);
  const scale = useTransform(p, [0.39, 0.62], [1.3, 1.05]);
  const x = useTransform(p, [0.39, 0.62], ["6%", "-2%"]);
  const humedad = useTransform(local, (v) => Math.round(55 - v * 48));
  const anillo = useTransform(local, (v) => 1 - v * 0.87);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 overflow-hidden">
      <motion.img
        style={{ scale, x }}
        src="/media/proceso/secado.jpg"
        alt="Granos de cacao secándose al sol en una bandeja de madera"
        className="absolute inset-0 size-full object-cover"
      />
      {/* rayos de sol */}
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(246,227,176,0.22)_0%,transparent_35%,transparent_60%,rgba(246,227,176,0.12)_80%,transparent)] mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#121211] via-[#121211]/55 to-transparent lg:via-[#121211]/30" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#121211] to-transparent" />
      <div className="absolute inset-y-0 right-0 hidden w-[45%] bg-gradient-to-l from-[#121211]/90 via-[#121211]/50 to-transparent lg:block" />
      <div className="absolute top-36 right-4 flex items-center gap-3 rounded-2xl border border-crema/15 bg-[#121211]/60 px-4 py-3 backdrop-blur-md sm:right-10 lg:top-auto lg:bottom-24">
        <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(239,227,207,0.15)" strokeWidth="4" />
          <motion.circle cx="22" cy="22" r="18" fill="none" stroke="#c98a2b" strokeWidth="4" strokeLinecap="round" style={{ pathLength: anillo }} />
        </svg>
        <div>
          <p className="flex items-center gap-1 text-[0.62rem] tracking-[0.2em] text-crema/60 uppercase">
            <Droplets className="size-3" /> Humedad
          </p>
          <p className="font-mono text-lg font-semibold">
            <motion.span>{humedad}</motion.span>%<span className="ml-1 text-xs font-normal text-crema/50">meta 7%</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── 4. Empaque: granos secos caen en el saco ORIVIA con anillo y destellos ── */
const CAIDA_SECOS = [
  { x: 40, delay: 0, giro: 120, tam: 20 },
  { x: 48, delay: 0.4, giro: -150, tam: 24 },
  { x: 55, delay: 0.75, giro: 180, tam: 19 },
  { x: 45, delay: 0.2, giro: -100, tam: 22 },
  { x: 52, delay: 0.6, giro: 140, tam: 21 },
];

export function EscenaEmpaque({ p }: { p: MotionValue<number> }) {
  const local = useLocal(p, 3);
  const opacity = useTransform(p, [0.59, 0.65, 0.8, 0.85], [0, 1, 1, 0]);
  const y = useTransform(p, [0.59, 0.68], [80, 0]);
  const scale = useTransform(p, [0.59, 0.68, 0.84], [0.88, 1, 0.92]);
  const giro = useTransform(local, [0, 1], [0, -900]);
  const fondo = useTransform(p, [0.59, 0.65], [0, 0.35]);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 overflow-hidden">
      <motion.img style={{ opacity: fondo }} src="/media/proceso/secado.jpg" alt="" className="absolute inset-0 size-full scale-110 object-cover blur-md brightness-50" />
      <motion.div style={{ y, scale }} className="absolute inset-0 grid place-items-center">
        <div className="relative aspect-[620/793] h-[78%] max-h-[620px]">
          <img
            src="/media/proceso/empaque.jpg"
            alt="Saco de fique ORIVIA con QR y huella SHA-256 recibiendo granos de cacao secos"
            className="absolute inset-0 size-full object-cover [mask-image:radial-gradient(ellipse_62%_70%_at_50%_52%,black_62%,transparent)]"
          />
          <AnilloOrbital giro={giro} className="top-[48%] left-[-18%] w-[136%]" />
          <GranosCayendo progreso={local} granos={CAIDA_SECOS} tipo="seco" desde="-6vh" hasta="22vh" className="left-[-4%] w-full" />
          <Destellos puntos={[[2, 22, 18], [6, 58, 22], [92, 30, 16], [88, 66, 14], [14, 8, 12]]} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 5. QR verificable: la tarjeta gira y aparece el sello ── */
const noop = () => () => {};

export function EscenaQr({ p }: { p: MotionValue<number> }) {
  const local = useLocal(p, 4);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const opacity = useTransform(p, [0.79, 0.85], [0, 1]);
  const rotateY = useSpring(useTransform(local, [0, 0.35], [75, -4]), { stiffness: 120, damping: 18 });
  const y = useTransform(local, [0, 0.35], [60, 0]);
  const sello = useSpring(useTransform(local, [0.3, 0.45], [0, 1]), { stiffness: 260, damping: 14 });
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 grid place-items-center [perspective:1200px]">
      <motion.div style={{ rotateY, y, rotateZ: -4 }} className="relative w-[min(58vw,300px)] max-lg:mt-16 lg:w-[min(72vw,300px)]">
        <motion.div
          style={{ scale: sello }}
          className="absolute -top-7 -left-6 z-10 grid size-16 place-items-center rounded-full bg-[#3fae6a] text-white shadow-[0_10px_30px_rgba(63,174,106,0.5)] [clip-path:polygon(50%_0%,61%_10%,75%_7%,80%_20%,93%_25%,90%_39%,100%_50%,90%_61%,93%_75%,80%_80%,75%_93%,61%_90%,50%_100%,39%_90%,25%_93%,20%_80%,7%_75%,10%_61%,0%_50%,10%_39%,7%_25%,20%_20%,25%_7%,39%_10%)]"
        >
          <BadgeCheck className="size-8" />
        </motion.div>
        <div className="overflow-hidden rounded-[1.5rem] bg-[#d9c9a8] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
          <div className="bg-[#3fae6a] py-3 pl-14 text-sm font-bold tracking-[0.18em] text-white">VERIFICADO</div>
          <div className="p-6 text-center text-bosque">
            <div className="mx-auto w-fit rounded-2xl bg-[#fffcf7] p-3 shadow-inner">
              {origin ? <QrCode value={`${origin}/ficha/CAC001`} label="QR de la ficha del lote CAC001" className="size-28 lg:size-40" /> : <div className="size-28 lg:size-40" />}
            </div>
            <p className="mt-4 text-sm font-semibold">Hash verificado en la cadena</p>
            <p className="mt-1 font-mono text-[0.7rem] text-bosque/70 underline">{origin ? `${origin.replace(/^https?:\/\//, "")}/ficha/CAC001` : "/ficha/CAC001"}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
