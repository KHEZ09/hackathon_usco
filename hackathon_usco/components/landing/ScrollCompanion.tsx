"use client";

import { useRef, useState, type RefObject } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Hummingbird } from "./Hummingbird";
import { CoffeeLeaf } from "./Botanica";

// Ruta del colibrí por la página (porcentajes del viewport), sección a sección.
const PATH_P = [0, 0.14, 0.3, 0.46, 0.62, 0.8, 1];
const PATH_X = ["94vw", "95vw", "4.5vw", "95vw", "4.5vw", "95vw", "50vw"];
const PATH_Y = ["72vh", "22vh", "34vh", "18vh", "46vh", "26vh", "30vh"];

/**
 * Capa "scroll world" de la página principal: un colibrí que acompaña el recorrido
 * y hojas de café desenfocadas en los bordes que se mueven en parallax.
 */
export function ScrollCompanion({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start 60%", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 18, mass: 0.6 });

  const x = useTransform(smooth, PATH_P, PATH_X);
  const y = useTransform(smooth, PATH_P, PATH_Y);
  const visible = useTransform(scrollYProgress, [0, 0.03, 0.97, 1], [0, 1, 1, 0.9]);

  // El colibrí mira hacia donde vuela.
  const [facingLeft, setFacingLeft] = useState(true);
  const lastX = useRef<number | null>(null);
  useMotionValueEvent(x, "change", (v) => {
    const px = (parseFloat(v) / 100) * window.innerWidth;
    if (lastX.current !== null && Math.abs(px - lastX.current) > 0.6) setFacingLeft(px < lastX.current);
    lastX.current = px;
  });

  const leavesLeftY = useTransform(scrollYProgress, [0, 1], ["10vh", "-60vh"]);
  const leavesRightY = useTransform(scrollYProgress, [0, 1], ["30vh", "-90vh"]);

  if (reduce) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 hidden overflow-hidden xl:block">
      <motion.div style={{ opacity: visible }} className="absolute inset-0">
        <motion.div style={{ y: leavesLeftY }} className="absolute top-[18%] -left-36 hidden w-80 rotate-[28deg] opacity-80 blur-[6px] xl:block">
          <CoffeeLeaf tone="profundo" className="w-full" />
          <CoffeeLeaf tone="medio" className="-mt-6 ml-10 w-4/5 -rotate-12" />
        </motion.div>
        <motion.div style={{ y: leavesRightY }} className="absolute top-[45%] -right-40 hidden w-96 -scale-x-100 rotate-[-20deg] opacity-80 blur-[7px] xl:block">
          <CoffeeLeaf tone="medio" className="w-full" />
          <CoffeeLeaf tone="profundo" className="-mt-8 ml-16 w-3/4 rotate-12" />
        </motion.div>

        <motion.div style={{ x, y }} className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-hover">
            <div className="transition-transform duration-500" style={{ transform: facingLeft ? "scaleX(-1)" : "none" }}>
              <Hummingbird className="w-20 drop-shadow-[0_10px_14px_rgba(12,29,21,0.35)]" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
