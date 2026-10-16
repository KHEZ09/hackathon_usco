"use client";

import type { CSSProperties } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import type { ProcessStage } from "@/data/cacaoProcessData";
import { CacaoLeaf } from "../Botanica";
import { FrameSequence } from "./FrameSequence";
import { Layer, LayeredScene } from "./LayeredScene";
import { ParticleField } from "./ParticleField";
import { Destellos, HumidityMeter, OrbitalRing, RayosSol } from "./Vectores";
import { useLocal } from "./utils";

/** Imagen WebP con respaldo JPG. */
function Foto({ stage, alt, className, style }: { stage: ProcessStage; alt: string; className?: string; style?: CSSProperties }) {
  return (
    <picture>
      <source srcSet={stage.visualAsset.imagePath} type="image/webp" />
      <img src={stage.visualAsset.fallbackImage} alt={alt} className={className} style={style} draggable={false} />
    </picture>
  );
}

const borde = "radial-gradient(ellipse 70% 72% at 50% 50%, black 62%, transparent)";
const mascara = (lineal: string): CSSProperties => ({
  maskImage: `${lineal}, ${borde}`,
  WebkitMaskImage: `${lineal}, ${borde}`,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
});

/* ── 1. Cosecha · canvas-sequence: la mazorca se abre cuadro a cuadro con el scroll ── */
export function EscenaCosecha({ p, stage }: { p: MotionValue<number>; stage: ProcessStage }) {
  const seq = stage.visualAsset.sequence!;
  const opacity = useTransform(p, [0, 0.21, 0.27], [1, 1, 0]);
  const y = useTransform(p, [0, 0.06], [60, 0]);
  const scale = useTransform(p, [0, 0.06, 0.2, 0.27], [0.86, 1, 1.02, 1.1]);
  const frame = useTransform(p, [0.05, 0.19], [0, seq.frames - 1]);
  const chispas = useTransform(p, [0, 0.22, 0.27], [1, 1, 0]);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <LayeredScene>
        <Layer depth={0.2}>
          <ParticleField mode="sparks" intensity={chispas} emitter={{ x0: 0, x1: 1, y: 1 }} rate={9} />
        </Layer>
        <Layer depth={0.7} className="grid place-items-center">
          <motion.div style={{ y, scale }} className="relative aspect-[620/857] h-[70%] max-h-[560px]">
            <div className="relative size-full overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] ring-1 ring-crema/10">
              <FrameSequence sequence={seq} frame={frame} fallback={stage.visualAsset.fallbackImage} alt="Mazorca de cacao madura en la rama que se abre y muestra sus granos" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(246,227,176,0.18),transparent_45%)]" />
            </div>
          </motion.div>
        </Layer>
      </LayeredScene>
    </motion.div>
  );
}

/* ── 2. Fermentación · layered-vector: mitades, vapor, granos con física y cajón en capas ── */
export function EscenaFermentacion({ p, stage }: { p: MotionValue<number>; stage: ProcessStage }) {
  const opacity = useTransform(p, [0.2, 0.26, 0.38, 0.43], [0, 1, 1, 0]);
  const scale = useTransform(p, [0.2, 0.42], [0.9, 1.03]);
  const y = useTransform(p, [0.2, 0.42], ["4%", "-2%"]);
  const flujo = useTransform(p, [0.21, 0.25, 0.38, 0.41], [0, 1, 1, 0]);
  const alt = "Mazorca abierta dejando caer granos frescos en un cajón de fermentación de madera";
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 cursor-pointer overflow-hidden" title="Toca para soltar más granos">
      <motion.div style={{ scale, y }} className="absolute inset-0 grid place-items-center">
        <div className="relative aspect-[1100/851] h-[92%] max-h-[720px]">
          <LayeredScene tilt={4}>
            <Layer depth={0.3}>
              <Foto stage={stage} alt={alt} className="absolute inset-0 size-full object-cover" style={mascara("linear-gradient(black 50%, transparent 62%)")} />
            </Layer>
            <Layer depth={0.45}>
              <ParticleField mode="steam" intensity={flujo} emitter={{ x0: 0.25, x1: 0.75, y: 0.66 }} rate={5} />
            </Layer>
            <Layer depth={0.55}>
              <ParticleField mode="beans-fresh" intensity={flujo} emitter={{ x0: 0.42, x1: 0.56, y: 0.42 }} floor={0.7} rate={7} burstOnTap />
            </Layer>
            <Layer depth={0.75}>
              <Foto stage={stage} alt="" className="absolute inset-0 size-full object-cover" style={mascara("linear-gradient(transparent 50%, black 60%)")} />
            </Layer>
          </LayeredScene>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 3. Secado · layered-vector: dolly sobre la bandeja, haces de sol, hojas y medidor de humedad ── */
export function EscenaSecado({ p, stage }: { p: MotionValue<number>; stage: ProcessStage }) {
  const local = useLocal(p, 2);
  const opacity = useTransform(p, [0.39, 0.45, 0.6, 0.66], [0, 1, 1, 0]);
  const scale = useTransform(p, [0.39, 0.62], [1.3, 1.05]);
  const x = useTransform(p, [0.39, 0.62], ["6%", "-2%"]);
  const hojasY = useTransform(p, [0.39, 0.66], ["18%", "-22%"]);
  const polvo = useTransform(p, [0.4, 0.45, 0.6, 0.64], [0, 1, 1, 0]);
  const metrica = stage.metrics?.[0];
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 overflow-hidden">
      <LayeredScene tilt={2.5}>
        <Layer depth={0.25}>
          <motion.div style={{ scale, x }} className="absolute inset-0">
            <Foto stage={stage} alt="Granos de cacao secándose al sol en una bandeja de madera" className="absolute inset-0 size-full object-cover" />
          </motion.div>
        </Layer>
        <Layer depth={0.15}>
          <RayosSol progress={local} />
        </Layer>
        <Layer depth={0.35}>
          <ParticleField mode="sparks" intensity={polvo} emitter={{ x0: 0, x1: 1, y: 1 }} rate={6} />
        </Layer>
        <div className="absolute inset-0 bg-gradient-to-r from-[#121211] via-[#121211]/55 to-transparent lg:via-[#121211]/30" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#121211] to-transparent" />
        <div className="absolute inset-y-0 right-0 hidden w-[45%] bg-gradient-to-l from-[#121211]/90 via-[#121211]/50 to-transparent lg:block" />
        <Layer depth={1.2}>
          <motion.div style={{ y: hojasY }} className="absolute inset-0">
            <CacaoLeaf tone="profundo" className="absolute -top-6 right-[8%] w-72 rotate-[150deg] opacity-80 blur-[3px]" />
            <CacaoLeaf tone="medio" className="absolute -bottom-8 left-[30%] hidden w-80 -rotate-[12deg] opacity-70 blur-[5px] sm:block" />
          </motion.div>
        </Layer>
      </LayeredScene>
      {metrica && <HumidityMeter metric={metrica} progress={local} className="absolute top-36 right-4 z-10 sm:right-10 lg:top-auto lg:bottom-24" />}
    </motion.div>
  );
}

/* ── 4. Empaque · layered-vector: anillo que rodea el saco, granos con física y destellos ── */
export function EscenaEmpaque({ p, stage, fondo }: { p: MotionValue<number>; stage: ProcessStage; fondo?: ProcessStage }) {
  const local = useLocal(p, 3);
  const opacity = useTransform(p, [0.59, 0.65, 0.8, 0.85], [0, 1, 1, 0]);
  const y = useTransform(p, [0.59, 0.68], [80, 0]);
  const scale = useTransform(p, [0.59, 0.68, 0.84], [0.88, 1, 0.92]);
  const giro = useTransform(local, [0, 1], [0, -1200]);
  const atenua = useTransform(p, [0.59, 0.65], [0, 0.35]);
  const flujo = useTransform(p, [0.6, 0.64, 0.78, 0.81], [0, 1, 1, 0]);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 cursor-pointer overflow-hidden" title="Toca para soltar más granos">
      {fondo && (
        <motion.div style={{ opacity: atenua }} className="absolute inset-0">
          <Foto stage={fondo} alt="" className="absolute inset-0 size-full scale-110 object-cover blur-md brightness-50" />
        </motion.div>
      )}
      <motion.div style={{ y, scale }} className="absolute inset-0 grid place-items-center">
        <div className="relative aspect-[620/793] h-[78%] max-h-[620px]">
          <LayeredScene tilt={6}>
            <Layer depth={0.35}>
              <OrbitalRing giro={giro} mitad="atras" className="top-[47%] left-[-18%] w-[136%]" />
            </Layer>
            <Layer depth={0.55}>
              <Foto
                stage={stage}
                alt="Saco de fique ORIVIA con QR y huella SHA-256 recibiendo granos de cacao secos"
                className="absolute inset-0 size-full object-cover"
                style={{ maskImage: "radial-gradient(ellipse 62% 70% at 50% 52%, black 62%, transparent)", WebkitMaskImage: "radial-gradient(ellipse 62% 70% at 50% 52%, black 62%, transparent)" }}
              />
            </Layer>
            <Layer depth={0.65}>
              <ParticleField mode="beans-dry" intensity={flujo} emitter={{ x0: 0.4, x1: 0.6, y: -0.04 }} floor={0.27} rate={6} burstOnTap />
            </Layer>
            <Layer depth={0.85}>
              <OrbitalRing giro={giro} mitad="adelante" className="top-[47%] left-[-18%] w-[136%]" />
            </Layer>
            <Layer depth={1}>
              <Destellos puntos={[[2, 22, 18], [6, 58, 22], [92, 30, 16], [88, 66, 14], [14, 8, 12]]} />
            </Layer>
          </LayeredScene>
        </div>
      </motion.div>
    </motion.div>
  );
}
