"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

type Sequence = { pattern: string; frames: number; pad: number };

/**
 * Secuencia de imágenes dibujada en Canvas 2D. `frame` es fraccional: mezcla los dos cuadros
 * vecinos para que el avance con el scroll sea fluido. Muestra `fallback` mientras carga.
 */
export function FrameSequence({ sequence, frame, fallback, alt, className }: { sequence: Sequence; frame: MotionValue<number>; fallback: string; alt: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const src = (i: number) => sequence.pattern.replace("{n}", String(i).padStart(sequence.pad, "0"));
    const imgs = Array.from({ length: sequence.frames }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
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

    const cover = (img: HTMLImageElement) => {
      const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const f = Math.max(0, Math.min(sequence.frames - 1, frame.get()));
      if (Math.abs(f - drawn) < 0.01) return;
      const a = Math.floor(f);
      const b = Math.min(sequence.frames - 1, a + 1);
      if (!ready(a)) return;
      ctx.globalAlpha = 1;
      cover(imgs[a]);
      const mix = f - a;
      if (mix > 0.02 && ready(b)) {
        ctx.globalAlpha = mix;
        cover(imgs[b]);
        ctx.globalAlpha = 1;
      }
      drawn = f;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [sequence.pattern, sequence.frames, sequence.pad, frame]);

  return <canvas ref={ref} role="img" aria-label={alt} className={cn("absolute inset-0 size-full bg-cover bg-center", className)} style={{ backgroundImage: `url(${fallback})` }} />;
}
