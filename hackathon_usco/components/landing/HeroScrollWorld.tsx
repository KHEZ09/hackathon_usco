"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { CoffeeLeaf } from "./Botanica";

// Secuencia extraída del video de referencia: 61 cuadros a 20 fps (0 s – 3 s).
const FRAME_COUNT = 61;
const FPS = 20;
const INTRO_END = 28; // el colibrí entra en escena al cargar (1,4 s)
const SCRUB_END = FRAME_COUNT - 1; // último cuadro del hero antes de la transición
const IDLE_MID = 24; // revoloteo en reposo alrededor de este cuadro
const IDLE_AMP = 4;
const frameSrc = (i: number) => `/media/hero/f${String(i).padStart(3, "0")}.jpg`;

const MOTES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 35 + ((i * 53) % 60),
  size: 2 + (i % 3),
  delay: (i * 0.9) % 12,
  duration: 11 + (i % 5) * 2,
}));

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Hero "scroll world": la secuencia del colibrí se reproduce como intro, revolotea en reposo
 * y luego se controla con el scroll mientras la página principal sube y lo cubre.
 */
export function HeroScrollWorld() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });

  useFrameScrub(canvasRef, scrollYProgress, !!reduce);

  const frameScale = useTransform(scrollYProgress, [0, 0.33, 1], [1, 1.04, 1.16]);
  const frameY = useTransform(scrollYProgress, [0.33, 1], ["0%", "-6%"]);
  const shade = useTransform(scrollYProgress, [0.3, 1], [0, 0.65]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const leafLeftX = useTransform(scrollYProgress, [0.15, 0.85], ["-45%", "5%"]);
  const leafRightX = useTransform(scrollYProgress, [0.2, 0.9], ["50%", "-4%"]);
  const leafRotate = useTransform(scrollYProgress, [0.15, 0.9], [-18, 6]);
  const leafOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);

  return (
    <section ref={wrapRef} aria-label="Bienvenida ORIVIA" className="relative h-[250svh] bg-bosque-950">
      <h1 className="sr-only">ORIVIA — Del origen al mundo. Trazabilidad del cacao del Huila.</h1>

      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Relleno para pantallas verticales: el mismo cuadro, desenfocado */}
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-70 blur-2xl sm:hidden"
          style={{ backgroundImage: "url(/media/hero-poster.jpg)" }}
        />

        {/* Cuadro 16:9 que cubre la pantalla; las capas se alinean en % del video */}
        <motion.div
          style={{ scale: frameScale, y: frameY }}
          className="absolute top-1/2 left-1/2 aspect-video w-[max(100vw,177.78svh)] -translate-x-1/2 -translate-y-1/2 max-sm:w-[280vw] max-sm:[mask-image:linear-gradient(transparent,black_10%,black_90%,transparent)]"
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 size-full bg-cover bg-center"
            style={{ backgroundImage: `url(${frameSrc(0)})` }}
          />
          {/* Difumina la barra impresa en el video; la navegación real va encima */}
          <div className="absolute inset-x-0 top-0 h-[10%] bg-bosque-950/25 backdrop-blur-xl [mask-image:linear-gradient(black_60%,transparent)]" />
          {/* Difumina los indicadores impresos del pie del video */}
          <div className="absolute top-[91%] left-[45%] h-[8%] w-[17%] rounded-full backdrop-blur-md [mask-image:radial-gradient(closest-side,black,transparent)]" />
          {/* Aura pulsante del isotipo */}
          <div
            className="absolute top-[32%] left-1/2 aspect-square w-[24%] rounded-full mix-blend-screen animate-glow"
            style={{
              background:
                "radial-gradient(circle, rgba(240,226,196,0.42) 0%, rgba(150,210,160,0.16) 38%, rgba(0,0,0,0) 68%)",
            }}
          />
        </motion.div>

        {/* Atmósfera: viñetas, neblina y partículas de luz */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent" />
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

        {/* Hojas en primer plano: la cámara se adentra en el cafetal */}
        <motion.div
          aria-hidden="true"
          style={{ x: leafLeftX, rotate: leafRotate, opacity: leafOpacity }}
          className="pointer-events-none absolute -bottom-10 -left-20 w-[70vw] max-w-[760px] blur-[8px] brightness-75"
        >
          <CoffeeLeaf tone="profundo" className="w-full drop-shadow-2xl" />
        </motion.div>
        <motion.div
          aria-hidden="true"
          style={{ x: leafRightX, opacity: leafOpacity }}
          className="pointer-events-none absolute top-[12%] -right-24 w-[55vw] max-w-[620px] -scale-x-100 rotate-[24deg] blur-[12px] brightness-75"
        >
          <CoffeeLeaf tone="profundo" className="w-full" />
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

function useFrameScrub(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  progress: MotionValue<number>,
  reduce: boolean,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(i);
      return img;
    });
    const ready = (i: number) => frames[i].complete && frames[i].naturalWidth > 0;

    let phase: "espera" | "intro" | "live" = "espera";
    let introStart = 0;
    let shown = reduce ? INTRO_END : 0;
    let drawn = -1;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.min(Math.round(canvas.offsetWidth * dpr), 2560);
      canvas.height = Math.round((canvas.width * 9) / 16);
      drawn = -1;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Dibuja el cuadro fraccional mezclando los dos cuadros vecinos.
    const draw = (index: number) => {
      if (Math.abs(index - drawn) < 0.002) return;
      const a = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(index)));
      const b = Math.min(FRAME_COUNT - 1, a + 1);
      const mix = index - a;
      if (!ready(a)) return;
      ctx.globalAlpha = 1;
      ctx.drawImage(frames[a], 0, 0, canvas.width, canvas.height);
      if (mix > 0.02 && ready(b)) {
        ctx.globalAlpha = mix;
        ctx.drawImage(frames[b], 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      drawn = index;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const p = progress.get();

      if (phase === "espera") {
        // Arranca cuando la parte de la intro está cargada.
        if (!frames.slice(0, INTRO_END + 1).every((_, i) => ready(i))) return;
        phase = reduce || p > 0.02 ? "live" : "intro";
        introStart = now;
      }

      if (phase === "intro") {
        shown = ((now - introStart) / 1000) * FPS;
        if (shown >= INTRO_END || p > 0.02) {
          shown = Math.min(shown, INTRO_END);
          phase = "live";
        }
        draw(shown);
        return;
      }

      if (p >= 0.999) return; // hero cubierto: no gastar trabajo

      const scrub = Math.min(1, p * 3);
      const target =
        scrub > 0.002
          ? INTRO_END + easeInOut(scrub) * (SCRUB_END - INTRO_END)
          : reduce
            ? INTRO_END
            : IDLE_MID + IDLE_AMP * Math.sin((now - introStart) / 520);

      shown += (target - shown) * 0.14;
      draw(shown);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [canvasRef, progress, reduce]);
}