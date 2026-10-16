"use client";

import { useRef, useState, type RefObject } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { RealisticDragonfly } from "./RealisticDragonfly";
import { CacaoLeaf, CacaoPod, useWind } from "./Botanica";

// Ruta de la libélula: se detiene en los márgenes y cruza rápido entre secciones.
const PATH_P = [0, 0.12, 0.2, 0.32, 0.4, 0.52, 0.6, 0.74, 0.82, 1];
const PATH_X = ["92vw", "93vw", "7vw", "6vw", "93vw", "94vw", "7vw", "6vw", "92vw", "50vw"];
const PATH_Y = ["70vh", "26vh", "38vh", "30vh", "22vh", "48vh", "28vh", "40vh", "24vh", "30vh"];

/**
 * Capa "scroll world" de la página principal: libélula que acompaña el recorrido y ramas de
 * cacao a los costados que se mecen con el viento. Los granos viven en GranosRodantes, solo en
 * los márgenes libres de las secciones claras.
 */
export function ScrollCompanion({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const reduce = useReducedMotion();
  const wind = useWind(1.4);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start 60%", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 20, mass: 0.5 });

  const x = useTransform(smooth, PATH_P, PATH_X);
  const y = useTransform(smooth, PATH_P, PATH_Y);
  const visible = useTransform(scrollYProgress, [0, 0.03, 0.97, 1], [0, 1, 1, 0.9]);

  const [facingLeft, setFacingLeft] = useState(true);
  const lastX = useRef<number | null>(null);
  useMotionValueEvent(x, "change", (v) => {
    const px = (parseFloat(v) / 100) * window.innerWidth;
    if (lastX.current !== null && Math.abs(px - lastX.current) > 0.6) setFacingLeft(px < lastX.current);
    lastX.current = px;
  });

  const leftY = useTransform(scrollYProgress, [0, 1], ["5vh", "-70vh"]);
  const rightY = useTransform(scrollYProgress, [0, 1], ["35vh", "-95vh"]);

  if (reduce) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <motion.div style={{ opacity: visible }} className="absolute inset-0">
        <motion.div style={{ y: leftY }} className="absolute top-[14%] -left-28 hidden w-72 xl:block">
          <SideCluster wind={wind} />
        </motion.div>
        <motion.div style={{ y: rightY }} className="absolute top-[42%] -right-28 hidden w-80 -scale-x-100 xl:block">
          <SideCluster wind={wind} conCacao />
        </motion.div>

        <motion.div style={{ x, y }} className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-hover">
            <div className="transition-transform duration-300" style={{ transform: facingLeft ? "scaleX(-1)" : "none" }}>
              <RealisticDragonfly className="w-20 drop-shadow-[0_12px_20px_rgba(12,29,21,0.45)] sm:w-28" wingSpeed={0.05} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function SideCluster({ wind, conCacao }: { wind?: MotionValue<number>; conCacao?: boolean }) {
  const fallback = useSpring(0);
  const w = wind ?? fallback;
  const hojas = useTransform(w, (v) => v * 1.2);
  const cacao = useTransform(w, (v) => -v * 2);
  return (
    <div className="relative blur-[3px]">
      <motion.div style={{ rotate: hojas }} className="origin-left">
        <div className="origin-left animate-sway rotate-[24deg]">
          <CacaoLeaf tone="profundo" className="w-full" />
        </div>
        <div className="-mt-10 ml-12 w-4/5 origin-left animate-sway [animation-delay:-1.2s] rotate-[-10deg]">
          <CacaoLeaf tone="medio" className="w-full" />
        </div>
        <div className="-mt-6 ml-4 w-3/5 origin-left animate-sway [animation-delay:-2.4s] rotate-[40deg]">
          <CacaoLeaf tone="brote" className="w-full" />
        </div>
      </motion.div>
      {conCacao && (
        <motion.div style={{ rotate: cacao }} className="absolute top-8 left-[46%] w-16 origin-top">
          <CacaoPod tone="amarilla" className="w-full drop-shadow-[0_16px_16px_rgba(0,0,0,0.35)]" />
        </motion.div>
      )}
    </div>
  );
}
