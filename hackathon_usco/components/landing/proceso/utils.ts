"use client";

import { useTransform, type MotionValue } from "framer-motion";
import { STAGE_RANGES } from "@/data/cacaoProcessData";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Progreso local (0→1) de una etapa dentro del progreso global de la sección. */
export function useLocal(p: MotionValue<number>, i: number) {
  const [a, b] = STAGE_RANGES[i];
  return useTransform(p, (v) => clamp01((v - a) / (b - a)));
}

/** Opacidad de una escena: entra al comenzar su rango y sale al terminar (con fundido cruzado). */
export function useStageOpacity(p: MotionValue<number>, i: number, fade = 0.035) {
  const [a, b] = STAGE_RANGES[i];
  const first = i === 0;
  const last = i === STAGE_RANGES.length - 1;
  return useTransform(
    p,
    [first ? -1 : a - fade, first ? 0 : a + fade, last ? 2 : b - fade, last ? 3 : b + fade],
    [first ? 1 : 0, 1, 1, last ? 1 : 0],
  );
}
