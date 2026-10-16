"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

type Sequence = { pattern: string; frames: number; pad: number; focus: { x: number; y: number } };

/**
 * Recorrido continuo dibujado en Canvas 2D. `frame` es fraccional: mezcla los dos cuadros vecinos
 * para que el avance sea fluido. Carga por prioridad (primero los cuadros cercanos al actual)
 * cuando la sección se acerca a la pantalla, y se detiene cuando no se ve.
 */
export function ProcessSequence({ sequence, frame, fallback, className }: { sequence: Sequence; frame: MotionValue<number>; fallback: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const src = (i: number) => sequence.pattern.replace("{n}", String(i).padStart(sequence.pad, "0"));
    const imgs: Array<HTMLImageElement | undefined> = new Array(sequence.frames);
    const ready = (i: number) => !!imgs[i] && imgs[i]!.complete && imgs[i]!.naturalWidth > 0;
    let drawn = -1;
    let raf = 0;
    let visible = false;
    let cargando = 0;

    // Carga los cuadros más cercanos al actual, de a 6 en paralelo.
    const cargar = () => {
      if (!visible) return;
      const actual = Math.round(frame.get());
      while (cargando < 6) {
        let siguiente = -1;
        for (let d = 0; d < sequence.frames; d++) {
          for (const i of [actual + d, actual - d]) {
            if (i >= 0 && i < sequence.frames && !imgs[i]) {
              siguiente = i;
              break;
            }
          }
          if (siguiente !== -1) break;
        }
        if (siguiente === -1) return;
        const img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = () => {
          cargando--;
          drawn = -1;
          cargar();
        };
        img.src = src(siguiente);
        imgs[siguiente] = img;
        cargando++;
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.offsetWidth * dpr);
      canvas.height = Math.round(canvas.offsetHeight * dpr);
      drawn = -1;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const cover = (img: HTMLImageElement) => {
      const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      const x = Math.min(0, Math.max(canvas.width - w, canvas.width / 2 - w * sequence.focus.x));
      const y = Math.min(0, Math.max(canvas.height - h, canvas.height / 2 - h * sequence.focus.y));
      ctx.drawImage(img, x, y, w, h);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const f = Math.max(0, Math.min(sequence.frames - 1, frame.get()));
      if (Math.abs(f - drawn) < 0.005) return;
      let a = Math.floor(f);
      // Si el cuadro aún no llegó, usa el más cercano ya cargado.
      if (!ready(a)) {
        for (let d = 1; d < sequence.frames; d++) {
          if (ready(a - d)) { a -= d; break; }
          if (ready(a + d)) { a += d; break; }
        }
        if (!ready(a)) return;
      }
      const b = Math.min(sequence.frames - 1, a + 1);
      ctx.globalAlpha = 1;
      cover(imgs[a]!);
      // Fundido corto alrededor del punto medio: cuadros nítidos sin doble imagen en movimientos rápidos.
      const t = Math.min(1, Math.max(0, (f - Math.floor(f) - 0.35) / 0.3));
      const mix = t * t * (3 - 2 * t);
      if (mix > 0.02 && ready(b) && a === Math.floor(f)) {
        ctx.globalAlpha = mix;
        cover(imgs[b]!);
        ctx.globalAlpha = 1;
      }
      drawn = f;
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        drawn = -1;
        cargar();
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(canvas);
    const unsub = frame.on("change", () => cargar());

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      unsub();
    };
  }, [sequence.pattern, sequence.frames, sequence.pad, sequence.focus.x, sequence.focus.y, frame]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Recorrido del cacao: la mazorca se abre, los granos fermentan en el cajón, se secan al sol y se empacan"
      className={cn("absolute inset-0 size-full bg-cover bg-center", className)}
      style={{ backgroundImage: `url(${fallback})` }}
    />
  );
}
