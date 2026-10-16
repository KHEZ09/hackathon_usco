"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

export type ParticleMode = "beans-fresh" | "beans-dry" | "steam" | "sparks";

type Props = {
  mode: ParticleMode;
  /** 0→1: cuántas partículas emite (0 detiene la emisión). Normalmente el progreso local de la etapa. */
  intensity: MotionValue<number>;
  /** Zona de emisión en fracciones del lienzo. */
  emitter: { x0: number; x1: number; y: number };
  /** Altura (fracción) del fondo donde rebotan y reposan los granos. */
  floor?: number;
  /** Partículas por segundo con intensidad 1. */
  rate?: number;
  /** Un clic o toque sobre la escena lanza una ráfaga de granos. */
  burstOnTap?: boolean;
  className?: string;
};

type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; life: number; max: number; rest: number; seed: number };

const MAX = 90;

/** Sprite de grano precalculado (fresco o seco) para dibujar rápido con drawImage. */
function beanSprite(fresh: boolean) {
  const c = document.createElement("canvas");
  c.width = 40;
  c.height = 60;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(14, 18, 2, 20, 30, 30);
  if (fresh) {
    grad.addColorStop(0, "#fffaf1");
    grad.addColorStop(0.55, "#efe3cf");
    grad.addColorStop(1, "#b9a27f");
  } else {
    grad.addColorStop(0, "#d1966a");
    grad.addColorStop(0.55, "#7a4526");
    grad.addColorStop(1, "#3a1d0e");
  }
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(20, 30, 14, 26, 0, 0, Math.PI * 2);
  g.fill();
  if (!fresh) {
    g.strokeStyle = "rgba(40,18,8,0.55)";
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(20, 7);
    g.bezierCurveTo(16, 22, 24, 38, 20, 53);
    g.stroke();
  }
  g.fillStyle = `rgba(255,255,255,${fresh ? 0.55 : 0.22})`;
  g.beginPath();
  g.ellipse(13, 19, 3.2, 7.5, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

/** Sprite de luz suave (vapor o chispa). */
function softSprite(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/**
 * Campo de partículas con física simple en Canvas 2D (gravedad, rebote, fricción, reposo y
 * repulsión del puntero). Corre a 60 fps con requestAnimationFrame y se pausa fuera de pantalla.
 */
export function ParticleField({ mode, intensity, emitter, floor = 0.9, rate = 10, burstOnTap = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || reduce) return;

    const beans = mode === "beans-fresh" || mode === "beans-dry";
    const sprite = beans ? beanSprite(mode === "beans-fresh") : softSprite(mode === "steam" ? "rgba(236,229,216,0.55)" : "rgba(246,227,176,1)");
    const ps: P[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let visible = false;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (x?: number, y?: number) => {
      if (ps.length >= MAX) ps.shift();
      const ex = x ?? (emitter.x0 + Math.random() * (emitter.x1 - emitter.x0)) * w;
      const ey = y ?? emitter.y * h;
      const scale = h / 700;
      if (beans) {
        ps.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 60, vy: Math.random() * 80, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 8, s: (16 + Math.random() * 10) * scale, life: 0, max: 99, rest: 0, seed: Math.random() });
      } else if (mode === "steam") {
        ps.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 12, vy: -(35 + Math.random() * 30) * scale, r: 0, vr: 0, s: (30 + Math.random() * 30) * scale, life: 0, max: 3 + Math.random() * 1.5, rest: 0, seed: Math.random() * 10 });
      } else {
        ps.push({ x: Math.random() * w, y: h * (0.3 + Math.random() * 0.75), vx: 0, vy: -(12 + Math.random() * 24), r: 0, vr: 0, s: 1.2 + Math.random() * 2.2, life: 0, max: 4 + Math.random() * 4, rest: 0, seed: Math.random() * 10 });
      }
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = intensity.get();
      if (!visible || (k < 0.01 && ps.length === 0)) return;

      acc += rate * k * dt;
      while (acc >= 1) {
        spawn();
        acc -= 1;
      }

      const g = 1900 * (h / 700);
      const floorY = floor * h;
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i];
        q.life += dt;
        // Repulsión del puntero: el usuario puede "soplar" granos y vapor.
        const dx = q.x - pointer.x;
        const dy = q.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 90 * 90 && d2 > 1) {
          const f = (1 - Math.sqrt(d2) / 90) * 900 * dt;
          q.vx += (dx / Math.sqrt(d2)) * f;
          q.vy += (dy / Math.sqrt(d2)) * f * 0.6;
        }
        if (beans) {
          if (q.rest > 0) {
            q.rest += dt;
            if (q.rest > 1.2) ps.splice(i, 1);
            continue;
          }
          q.vy += g * dt;
          q.vx *= 0.995;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.r += q.vr * dt;
          if (q.y >= floorY) {
            q.y = floorY;
            q.vy *= -0.28;
            q.vx *= 0.55;
            q.vr *= 0.5;
            if (Math.abs(q.vy) < 70) q.rest = 0.0001;
          }
          if (q.y > h + 60) ps.splice(i, 1);
        } else {
          q.x += (q.vx + Math.sin(q.life * 1.6 + q.seed) * (mode === "steam" ? 14 : 6)) * dt;
          q.y += q.vy * dt;
          if (q.life > q.max) ps.splice(i, 1);
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const q of ps) {
        if (beans) {
          const a = q.rest > 0 ? Math.max(0, 1 - q.rest / 1.2) : 1;
          ctx.globalAlpha = a;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.r);
          ctx.shadowColor = "rgba(0,0,0,0.45)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;
          ctx.drawImage(sprite, -q.s / 2, -q.s * 0.75, q.s, q.s * 1.5);
          ctx.restore();
        } else if (mode === "steam") {
          const t = q.life / q.max;
          const size = q.s * (1 + t * 2.2);
          ctx.globalAlpha = Math.sin(Math.PI * t) * 0.35;
          ctx.drawImage(sprite, q.x - size / 2, q.y - size / 2, size, size);
        } else {
          const t = q.life / q.max;
          ctx.globalAlpha = Math.sin(Math.PI * t) * (0.55 + 0.45 * Math.sin(q.life * 6 + q.seed));
          const size = q.s * 5;
          ctx.drawImage(sprite, q.x - size / 2, q.y - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(step);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    const host = canvas.parentElement;
    const onTap = (e: PointerEvent) => {
      if (!burstOnTap || intensity.get() < 0.01) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      for (let i = 0; i < 7; i++) spawn(x + (Math.random() - 0.5) * 40, emitter.y * h - Math.random() * 30);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    host?.addEventListener("pointerdown", onTap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      host?.removeEventListener("pointerdown", onTap);
    };
  }, [mode, intensity, emitter.x0, emitter.x1, emitter.y, floor, rate, burstOnTap, reduce]);

  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full", className)} />;
}
