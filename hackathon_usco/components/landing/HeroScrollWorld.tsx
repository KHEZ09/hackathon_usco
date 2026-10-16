"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationFrame, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { CacaoLeaf, CacaoPod, useWind } from "./Botanica";
import { RealisticDragonfly } from "./RealisticDragonfly";
import { OriviaIsotipo } from "@/components/brand/OriviaLogo";

const MOTES = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 35 + ((i * 53) % 60),
  size: 2 + (i % 3),
  delay: (i * 0.9) % 12,
  duration: 11 + (i % 5) * 2,
}));

/**
 * Hero limpio y cinematográfico con logotipo y título centrados,
 * fotografía nítida del cacaotal y libélula viva sobrevolando la escena.
 */
export function HeroScrollWorld() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const wind = useWind(1.2);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });

  const frameScale = useTransform(scrollYProgress, [0, 0.33, 1], [1, 1.04, 1.15]);
  const frameY = useTransform(scrollYProgress, [0.33, 1], ["0%", "-6%"]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-40%"]);
  const contentOpacity = useTransform(scrollYProgress, [0.15, 0.45], [1, 0]);
  const shade = useTransform(scrollYProgress, [0.3, 1], [0, 0.75]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const leafLeftX = useTransform(scrollYProgress, [0.15, 0.85], ["-45%", "5%"]);
  const leafRightX = useTransform(scrollYProgress, [0.2, 0.9], ["50%", "-4%"]);
  const leafRotate = useTransform(scrollYProgress, [0.15, 0.9], [-18, 6]);
  const leafOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);
  const podY = useTransform(scrollYProgress, [0.1, 0.9], ["-70%", "10%"]);
  const podRotate = useTransform(wind ?? scrollYProgress, (v) => (wind ? -v * 1.8 : 0));

  return (
    <section ref={wrapRef} aria-label="Bienvenida ORIVIA" className="relative h-[240svh] bg-bosque-950">
      <h1 className="sr-only">ORIVIA — Del origen al mundo. Trazabilidad del cacao del Huila.</h1>

      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Relleno para pantallas verticales: el mismo cuadro desenfocado */}
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-70 blur-2xl sm:hidden"
          style={{ backgroundImage: "url(/media/hero-poster.jpg)" }}
        />

        {/* Fotografía limpia cinematográfica 16:9 en alta definición */}
        <motion.div
          style={{ scale: frameScale, y: frameY }}
          className="@container absolute top-1/2 left-1/2 aspect-video w-[max(100vw,177.78svh)] -translate-x-1/2 -translate-y-1/2 max-sm:w-[280vw]"
        >
          {/* Ken Burns: zoom y paneo lentísimo estilo documental */}
          <div
            role="img"
            aria-label="Cacaotal en el Huila, agricultor sosteniendo un fruto de cacao rojo maduro"
            className="absolute inset-0 size-full bg-cover bg-center animate-[ken-burns_22s_ease-in-out_infinite_alternate]"
            style={{ backgroundImage: "url(/media/hero-clean.jpg)" }}
          />
          {/* Haz de luz solar 1: barre de izquierda a derecha como sol entre hojas */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-[200%] -left-1/2"
            style={{
              background: "linear-gradient(105deg, transparent 30%, rgba(226,184,110,0.22) 48%, rgba(245,236,180,0.12) 52%, transparent 70%)",
              animation: "sun-sweep 18s ease-in-out infinite alternate",
            }}
          />
          {/* Haz de luz solar 2: más suave, desfasado, para volumen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-[200%] -left-1/2"
            style={{
              background: "linear-gradient(100deg, transparent 35%, rgba(210,168,90,0.10) 50%, transparent 65%)",
              animation: "sun-sweep 26s ease-in-out infinite alternate-reverse",
              animationDelay: "-9s",
            }}
          />
          {/* Suave viñeta perimetral transparente y homogénea */}
          <div className="absolute inset-0 bg-gradient-to-t from-bosque-950/60 via-transparent to-black/25" />
        </motion.div>

        {/* Libélula hiperrealista animada que sobrevuela con vida orgánica el cacaotal */}
        {/* Libélula hiperrealista animada que sobrevuela con vida orgánica el cacaotal */}
        <HeroSpiralDragonfly progress={scrollYProgress} />

        {/* Logotipo (isotipo) + Título ORIVIA centrados */}
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center -translate-y-2 sm:-translate-y-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.25, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <OriviaIsotipo className="h-24 sm:h-32 lg:h-36 drop-shadow-[0_10px_24px_rgba(226,184,110,0.4)]" />
            <span className="mt-4 text-4xl font-light tracking-[0.32em] text-crema [text-shadow:0_0_28px_rgba(226,184,110,0.55)] sm:text-6xl lg:text-7xl">
              ORIVIA
            </span>
            <span className="mt-3 text-[0.68rem] font-normal tracking-[0.45em] text-crema/95 sm:text-xs [text-shadow:0_1px_8px_rgba(0,0,0,0.55),0_0_12px_rgba(226,184,110,0.25)]">
              DEL ORIGEN AL MUNDO
            </span>
          </motion.div>
        </motion.div>

        {/* Atmósfera: viñetas, neblina y partículas de luz */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bosque-950/75 to-transparent" />
          <div className="absolute top-[38%] -left-1/4 h-40 w-[150%] animate-mist rounded-full bg-crema/10 blur-3xl" />
          <div className="absolute top-[58%] -left-1/4 h-28 w-[150%] animate-mist rounded-full bg-crema/[0.07] blur-3xl [animation-direction:reverse]" />
          {MOTES.map((m, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-[#f6e7b8] shadow-[0_0_8px_2px_rgba(246,231,184,0.55)] animate-mote"
              style={{
                left: `${m.left}%`,
                top: `${m.top}%`,
                width: m.size,
                height: m.size,
                animationDelay: `${m.delay}s`,
                animationDuration: `${m.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Hojas y fruto de cacao en primer plano: la cámara se adentra en el cacaotal */}
        <motion.div
          aria-hidden="true"
          style={{ x: leafLeftX, rotate: leafRotate, opacity: leafOpacity }}
          className="pointer-events-none absolute -bottom-10 -left-20 w-[72vw] max-w-[780px] blur-[8px] brightness-75"
        >
          <CacaoLeaf tone="profundo" className="w-full drop-shadow-2xl" />
        </motion.div>
        <motion.div
          aria-hidden="true"
          style={{ x: leafRightX, opacity: leafOpacity }}
          className="pointer-events-none absolute top-[10%] -right-24 w-[56vw] max-w-[640px] -scale-x-100 rotate-[24deg] blur-[12px] brightness-75"
        >
          <CacaoLeaf tone="brote" className="w-full" />
        </motion.div>
        <motion.div
          aria-hidden="true"
          style={{ y: podY, opacity: leafOpacity }}
          className="pointer-events-none absolute top-0 right-[9%] w-[14vw] max-w-[170px] min-w-[80px] blur-[3px]"
        >
          <motion.div style={{ rotate: podRotate }} className="origin-top">
            <CacaoPod tone="roja" className="w-full drop-shadow-[0_30px_30px_rgba(0,0,0,0.5)]" />
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-bosque-950" />

        <ScrollCue opacity={cueOpacity} />
      </div>
    </section>
  );
}
function ScrollCue({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.a
      href="#origen"
      style={{ opacity }}
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0 }}
      transition={{ delay: 1.6, duration: 0.8 }}
      className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-crema/85"
    >
      <span className="text-[0.6rem] font-light tracking-[0.3em] whitespace-nowrap uppercase sm:text-[0.65rem] sm:tracking-[0.42em]">Desliza para descubrir</span>
      <span className="relative h-10 w-px overflow-hidden bg-crema/25">
        <motion.span
          className="absolute inset-x-0 top-0 h-1/2 bg-crema"
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
    </motion.a>
  );
}

/**
 * Trayectoria viva de vuelo en el cacaotal:
 * - Sobrevuela con gracia todo el espacio aéreo de la pantalla.
 * - Evita la zona central donde está el logo/título ORIVIA.
 * - Orientación y giro dinámico según la dirección de vuelo (scaleX).
 * - Alabeo (roll) en curvas, cabeceo (pitch) y profundidad Z dinámica.
 */
function HeroSpiralDragonfly({ progress }: { progress: MotionValue<number> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const lastFacingRight = useRef(true);

  useAnimationFrame((time) => {
    if (!containerRef.current || !visualRef.current || reduce) return;
    const t = time / 1000;
    const p = progress.get();

    // Múltiples frecuencias para un vuelo orgánico e impredecible
    const a1 = t * 0.38;
    const a2 = t * 0.27;
    const a3 = t * 0.17;

    // Trayectoria amplia que recorre bordes y esquinas de la pantalla
    let rawX =
      50 +
      30 * Math.cos(a1) +
      10 * Math.sin(a2 * 1.7) +
      4 * Math.cos(t * 2.1);
    let rawY =
      50 +
      24 * Math.sin(a1 * 0.85) +
      8 * Math.cos(a3 * 2.3) +
      3 * Math.sin(t * 3.1);

    // Con el scroll (p), la libélula desciende guiando hacia la siguiente sección
    rawX += p * 12;
    rawY += p * 35;

    // Zona de exclusión suave alrededor del logo central (~50vw, ~46vh)
    const logoCX = 50;
    const logoCY = 46;
    const dx = rawX - logoCX;
    const dy = rawY - logoCY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const safeRadius = 24; // radio mínimo en unidades vw/vh alrededor del logo

    if (dist < safeRadius && dist > 0.1) {
      const push = ((safeRadius - dist) / safeRadius) * 1.15;
      rawX += (dx / dist) * safeRadius * push;
      rawY += (dy / dist) * safeRadius * push;
    }

    // Mantener dentro de la pantalla visible
    const x = Math.max(4, Math.min(96, rawX));
    const y = Math.max(4, Math.min(92, rawY));

    // Derivadas para dirección del vuelo
    const vx =
      -30 * Math.sin(a1) * 0.38 +
      10 * 1.7 * Math.cos(a2 * 1.7) * 0.27 +
      -4 * 2.1 * Math.sin(t * 2.1);
    const vy =
      24 * 0.85 * Math.cos(a1 * 0.85) * 0.38 +
      -8 * 2.3 * Math.sin(a3 * 2.3) * 0.17 +
      3 * 3.1 * Math.cos(t * 3.1);

    if (Math.abs(vx) > 0.6) {
      lastFacingRight.current = vx > 0;
    }

    // Inclinación biomecánica 3D
    const facingMult = lastFacingRight.current ? 1 : -1;
    const tilt = Math.max(-16, Math.min(16, vy * 1.3 * facingMult));
    const pitch = Math.max(-12, Math.min(12, -vy * 0.9));
    const scale = 0.92 + 0.16 * Math.sin(a1);

    containerRef.current.style.left = `${x}vw`;
    containerRef.current.style.top = `${y}vh`;
    containerRef.current.style.transform = "translate(-50%, -50%)";

    visualRef.current.style.transform = `scale(${scale}) scaleX(${facingMult}) rotate(${tilt}deg) rotateX(${pitch}deg)`;
  });

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed top-1/2 left-1/2 z-20 w-24 sm:w-36 lg:w-44 -translate-x-1/2 -translate-y-1/2 transform-gpu"
    >
      <div ref={visualRef} className="w-full transition-transform duration-200 ease-out origin-center">
        <RealisticDragonfly className="w-full" wingSpeed={0.048} glow />
      </div>
    </div>
  );
}