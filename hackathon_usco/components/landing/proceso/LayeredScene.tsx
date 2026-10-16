"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

type Pointer = { px: MotionValue<number>; py: MotionValue<number> };
const PointerCtx = createContext<Pointer | null>(null);

/**
 * Escena en capas: sigue al puntero con resortes (inclinación 3D suave) y reparte el
 * movimiento entre capas según su profundidad, como una cámara con paralaje.
 */
export function LayeredScene({ children, className, tilt = 5 }: { children: ReactNode; className?: string; tilt?: number }) {
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 90, damping: 18, mass: 0.6 });
  const py = useSpring(rawY, { stiffness: 90, damping: 18, mass: 0.6 });
  const rotateY = useTransform(px, (v) => v * tilt);
  const rotateX = useTransform(py, (v) => -v * tilt * 0.7);

  return (
    <div
      className={cn("absolute inset-0 [perspective:1400px]", className)}
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
        rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
    >
      <PointerCtx.Provider value={{ px, py }}>
        <motion.div style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }} className="absolute inset-0">
          {children}
        </motion.div>
      </PointerCtx.Provider>
    </div>
  );
}

/** Capa con profundidad: 0 = fondo inmóvil, 1 = primer plano que se desplaza más. */
export function Layer({ depth, children, className, style }: { depth: number; children?: ReactNode; className?: string; style?: CSSProperties }) {
  const ctx = useContext(PointerCtx);
  const fallback = useMotionValue(0);
  const x = useTransform(ctx?.px ?? fallback, (v) => v * depth * -22);
  const y = useTransform(ctx?.py ?? fallback, (v) => v * depth * -14);
  return (
    <motion.div style={{ x, y, ...style }} className={cn("absolute inset-0", className)}>
      {children}
    </motion.div>
  );
}
