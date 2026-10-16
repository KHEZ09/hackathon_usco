"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, Leaf, Package, QrCode as QrIcon, Sun, Timer } from "lucide-react";
import { QrCode } from "@/components/ficha/QrCode";
import { cn } from "@/lib/cn";

// Secuencia del video de referencia: la mazorca se abre en tres capas (35 cuadros).
const POD_FRAMES = 35;
const podSrc = (i: number) => `/media/mazorca/p${String(i).padStart(3, "0")}.jpg`;

const PASOS = [
  { icon: Leaf, titulo: "Finca La Esperanza", detalle: "Cosecha de mazorcas maduras · Rivera" },
  { icon: Timer, titulo: "Fermentación", detalle: "6 días en cajones de madera" },
  { icon: Sun, titulo: "Secado", detalle: "Secado solar hasta 7% de humedad" },
  { icon: Package, titulo: "Empaque", detalle: "Lote sellado con su huella SHA-256" },
  { icon: QrIcon, titulo: "QR verificable", detalle: "La historia viaja con el producto" },
];

const noop = () => () => {};

/** Sección "Del grano al producto": la mazorca se abre con el scroll y se encienden las etapas. */
export function PodSection() {
  const ref = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const frame = useTransform(scrollYProgress, [0.05, 0.62], [0, POD_FRAMES - 1], { clamp: true });
  const [paso, setPaso] = useState(0);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setPaso(Math.max(0, Math.min(PASOS.length - 1, Math.floor(((p - 0.05) / 0.8) * PASOS.length))));
  });

  useSequence(canvasRef, frame);

  const podScale = useTransform(scrollYProgress, [0, 0.6, 1], [0.86, 1, 1.04]);
  const podRotate = useTransform(scrollYProgress, [0, 1], [-4, 3]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const qrOpacity = useTransform(scrollYProgress, [0.55, 0.75], [0, 1]);
  const qrY = useTransform(scrollYProgress, [0.55, 0.75], [40, 0]);

  return (
    <section ref={ref} id="proceso" aria-label="Del grano al producto" className="relative h-[320svh] px-3 sm:px-6">
      <div className="sticky top-3 h-[calc(100svh-1.5rem)] overflow-hidden rounded-[2.5rem] bg-[#141413] text-crema">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(201,138,43,0.16),transparent_60%)]" />
        <Rings rotate={ringRotate} />

        <div className="relative mx-auto grid h-full max-w-7xl grid-rows-[auto_1fr_auto] gap-4 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_minmax(0,1.1fr)_1fr] lg:grid-rows-1 lg:items-center lg:py-0">
          {/* Etapas */}
          <div className="lg:order-1">
            <p className="text-[0.65rem] font-semibold tracking-[0.32em] text-ambar uppercase">Del grano al producto</p>
            <h2 className="mt-3 max-w-xs text-2xl leading-tight font-semibold sm:text-4xl">Una mazorca, cada etapa a la vista.</h2>
            <ol className="mt-6 hidden space-y-3 lg:block">
              {PASOS.map((s, i) => (
                <li key={s.titulo} className={cn("flex items-center gap-3 transition-all duration-500", i <= paso ? "opacity-100" : "opacity-30")}>
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full border transition-all duration-500",
                      i === paso ? "border-ambar bg-ambar/20 text-[#f3c77e] shadow-[0_0_24px_rgba(201,138,43,0.55)]" : "border-crema/20 text-crema/70",
                    )}
                  >
                    <s.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{s.titulo}</span>
                    <span className="block text-[0.7rem] text-crema/55">{s.detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Mazorca */}
          <motion.div style={{ scale: podScale, rotate: podRotate }} className="relative mx-auto h-full max-h-[78svh] w-full max-w-[460px] lg:order-2 lg:h-[82svh]">
            <canvas
              ref={canvasRef}
              aria-label="Mazorca de cacao que se abre mostrando sus granos"
              role="img"
              className="absolute inset-0 size-full"
            />
          </motion.div>

          {/* Etapa activa (móvil) y QR */}
          <div className="lg:order-3">
            <div className="flex items-center gap-3 lg:hidden">
              {(() => {
                const S = PASOS[paso];
                return (
                  <>
                    <span className="grid size-10 place-items-center rounded-full border border-ambar bg-ambar/20 text-[#f3c77e]">
                      <S.icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{S.titulo}</span>
                      <span className="block text-[0.7rem] text-crema/60">{S.detalle}</span>
                    </span>
                  </>
                );
              })()}
            </div>
            <motion.div style={{ opacity: qrOpacity, y: qrY }} className="mt-4 hidden rounded-[1.75rem] border border-crema/10 bg-crema/[0.06] p-5 backdrop-blur lg:block">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Proceso verificado</p>
                <span className="rounded-full bg-bosque-500/30 px-2.5 py-0.5 text-[0.6rem] font-bold tracking-wider text-[#9fd3b1]">LIBERADO</span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="rounded-2xl bg-[#fffcf7] p-2 shadow-[0_0_30px_rgba(201,138,43,0.35)]">
                  {origin ? <QrCode value={`${origin}/ficha/CAC002`} label="QR de la ficha del lote CAC002" className="size-24" /> : <div className="size-24" />}
                </div>
                <div>
                  <p className="font-mono text-[0.7rem] text-crema/60">Lote CAC002</p>
                  <p className="text-xs leading-relaxed text-crema/80">Escanea para ver origen, proceso y estado.</p>
                </div>
              </div>
              <Link
                href="/ficha/CAC002"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-crema px-4 py-2 text-xs font-semibold text-bosque transition hover:bg-white"
              >
                Abrir ficha pública <ArrowUpRight className="size-3.5" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Progreso */}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {PASOS.map((s, i) => (
            <span key={s.titulo} className={cn("h-1.5 rounded-full transition-all duration-500", i === paso ? "w-8 bg-ambar" : "w-2 bg-crema/25")} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Rings({ rotate }: { rotate: MotionValue<number> }) {
  return (
    <motion.svg style={{ rotate }} viewBox="0 0 400 400" className="pointer-events-none absolute top-1/2 left-1/2 w-[min(120vw,1100px)] -translate-x-1/2 -translate-y-1/2 opacity-40" aria-hidden="true">
      <circle cx="200" cy="200" r="190" fill="none" stroke="#c98a2b" strokeOpacity="0.25" strokeDasharray="2 6" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="#efe3cf" strokeOpacity="0.12" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="#c98a2b" strokeOpacity="0.3" strokeDasharray="40 14 4 14" />
      <circle cx="200" cy="10" r="3" fill="#f3c77e" />
      <circle cx="350" cy="200" r="2" fill="#efe3cf" />
    </motion.svg>
  );
}

/** Dibuja en el canvas el cuadro (fraccional) indicado por el valor de movimiento. */
function useSequence(canvasRef: React.RefObject<HTMLCanvasElement | null>, frame: MotionValue<number>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const imgs = Array.from({ length: POD_FRAMES }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      img.src = podSrc(i);
      return img;
    });
    const ready = (i: number) => imgs[i].complete && imgs[i].naturalWidth > 0;
    let drawn = -1;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.offsetWidth * dpr);
      canvas.height = Math.round(canvas.offsetHeight * dpr);
      drawn = -1;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawImg = (img: HTMLImageElement) => {
      // "contain" centrado.
      const s = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const f = frame.get();
      if (Math.abs(f - drawn) < 0.01) return;
      const a = Math.floor(f);
      const b = Math.min(POD_FRAMES - 1, a + 1);
      if (!ready(a)) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      drawImg(imgs[a]);
      const mix = f - a;
      if (mix > 0.02 && ready(b)) {
        ctx.globalAlpha = mix;
        drawImg(imgs[b]);
        ctx.globalAlpha = 1;
      }
      // Funde los bordes del cuadro con el fondo (máscara elíptica suave).
      const s = Math.min(canvas.width / imgs[a].naturalWidth, canvas.height / imgs[a].naturalHeight);
      const iw = imgs[a].naturalWidth * s;
      const ih = imgs[a].naturalHeight * s;
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(iw / 2, ih / 2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.62, "rgba(0,0,0,1)");
      g.addColorStop(0.92, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      drawn = f;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef, frame]);
}
