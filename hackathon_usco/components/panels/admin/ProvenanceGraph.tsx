"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { merma, MERMA_UMBRAL, type Datos, type Estado } from "@/lib/store";
import { cn } from "@/lib/cn";

type Tipo = "lote" | "etapa" | "producto";
type Nodo = { id: string; loteId: string; tipo: Tipo; label: string; detalle: string; x: number; y: number; z: number; alerta: boolean; estado: Estado };
type Arista = { a: string; b: string };

const COLOR: Record<Tipo, string> = { lote: "#d9c9b1", etapa: "#3f7a5e", producto: "#b88a6c" };

function construir(d: Datos) {
  const nodos: Nodo[] = [];
  const aristas: Arista[] = [];
  const n = d.lotes.length;
  d.lotes.forEach((l, i) => {
    const y = (i - (n - 1) / 2) * Math.min(0.95, 2.6 / Math.max(n, 1));
    const z = Math.sin(i * 1.7) * 0.7;
    nodos.push({ id: `L:${l.id}`, loteId: l.id, tipo: "lote", label: l.id, detalle: `${l.origen} · ${l.recibidoKg} kg recibidos`, x: -1.35, y, z, alerta: false, estado: l.estado });
    const trs = d.transformaciones.filter((t) => t.loteId === l.id);
    trs.forEach((t, k) => {
      const m = merma(t);
      nodos.push({
        id: `T:${t.id}`,
        loteId: l.id,
        tipo: "etapa",
        label: t.etapa,
        detalle: `${t.entradaKg} → ${t.salidaKg} kg · merma ${m}%`,
        x: -0.15 + (k % 2) * 0.35,
        y: y + (k - (trs.length - 1) / 2) * 0.42,
        z: z + (k % 2 ? 0.45 : -0.35),
        alerta: m > MERMA_UMBRAL,
        estado: l.estado,
      });
      aristas.push({ a: `L:${l.id}`, b: `T:${t.id}` }, { a: `T:${t.id}`, b: `P:${l.id}` });
    });
    if (!trs.length) aristas.push({ a: `L:${l.id}`, b: `P:${l.id}` });
    nodos.push({ id: `P:${l.id}`, loteId: l.id, tipo: "producto", label: l.producto, detalle: `Estado ${l.estado}`, x: 1.35, y, z: -z, alerta: false, estado: l.estado });
  });
  return { nodos, aristas };
}

type Props = { datos: Datos; seleccionado: string; onSelect: (loteId: string) => void };

/** Grafo 3D de procedencia en Canvas 2D con proyección en perspectiva: rota, responde al hover y al clic. */
export function ProvenanceGraph({ datos, seleccionado, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodos, aristas } = useMemo(() => construir(datos), [datos]);
  const [hover, setHover] = useState<Nodo | null>(null);
  const [auto, setAuto] = useState(true);
  const state = useRef({ angle: -0.5, tilt: 0.28, drag: null as null | { x: number; y: number; angle: number; tilt: number }, mouse: null as null | { x: number; y: number }, proj: [] as { n: Nodo; x: number; y: number; r: number }[] });
  const selRef = useRef(seleccionado);
  const autoRef = useRef(auto);
  const hoverRef = useRef<Nodo | null>(null);

  useEffect(() => {
    selRef.current = seleccionado;
    autoRef.current = auto;
  }, [seleccionado, auto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const family = getComputedStyle(canvas).fontFamily;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const s = state.current;
      if (autoRef.current && !s.drag && !reduce) s.angle += 0.0035;
      const cosA = Math.cos(s.angle);
      const sinA = Math.sin(s.angle);
      const cosT = Math.cos(s.tilt);
      const sinT = Math.sin(s.tilt);
      const yMax = nodos.reduce((m, nd) => Math.max(m, Math.abs(nd.y)), 0.5);
      const scale = Math.min(w / 4.1, h / (2 * (yMax + 1.05)));
      const dist = 4;

      const proj = nodos.map((n) => {
        const x1 = n.x * cosA + n.z * sinA;
        const z1 = -n.x * sinA + n.z * cosA;
        const y1 = n.y * cosT - z1 * sinT;
        const z2 = n.y * sinT + z1 * cosT;
        const p = dist / (dist + z2);
        return { n, x: w / 2 + x1 * scale * p, y: h / 2 + y1 * scale * p, r: (n.tipo === "etapa" ? 9 : 13) * p, depth: z2 };
      });
      const byId = new Map(proj.map((p) => [p.n.id, p]));
      s.proj = proj;

      // Hover por cercanía al puntero.
      let hov: Nodo | null = null;
      if (s.mouse && !s.drag) {
        let best = 22;
        for (const p of proj) {
          const d = Math.hypot(p.x - s.mouse.x, p.y - s.mouse.y);
          if (d < Math.max(best, p.r + 6)) {
            best = d;
            hov = p.n;
          }
        }
      }
      if (hov?.id !== hoverRef.current?.id) {
        hoverRef.current = hov;
        setHover(hov);
      }

      ctx.clearRect(0, 0, w, h);
      // Rejilla de suelo sutil.
      ctx.strokeStyle = "rgba(241,235,224,0.05)";
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        for (const [ax, az, bx, bz] of [
          [i * 0.5, -1.5, i * 0.5, 1.5],
          [-1.5, i * 0.5, 1.5, i * 0.5],
        ]) {
          const pt = (x: number, z: number) => {
            const x1 = x * cosA + z * sinA;
            const z1 = -x * sinA + z * cosA;
            const y1 = 1.55 * cosT - z1 * sinT;
            const z2 = 1.55 * sinT + z1 * cosT;
            const p = dist / (dist + z2);
            return [w / 2 + x1 * scale * p, h / 2 + y1 * scale * p];
          };
          const [x0, y0] = pt(ax, az);
          const [x1, y1] = pt(bx, bz);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }

      const sel = selRef.current;
      const focus = hov?.loteId ?? sel;
      for (const e of aristas) {
        const a = byId.get(e.a);
        const b = byId.get(e.b);
        if (!a || !b) continue;
        const on = a.n.loteId === focus;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, on ? "rgba(217,201,177,0.85)" : "rgba(217,201,177,0.16)");
        grad.addColorStop(1, on ? "rgba(63,122,94,0.95)" : "rgba(63,122,94,0.18)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = on ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2;
        ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        ctx.stroke();
        if (on && !reduce) {
          // Partícula que recorre la arista (flujo de procedencia).
          const t = (performance.now() / 1600 + a.y * 0.01) % 1;
          const u = 1 - t;
          const px = u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x;
          const py = u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y;
          ctx.fillStyle = "#f6e7b8";
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      [...proj].sort((p, q) => q.depth - p.depth).forEach((p) => {
        const on = p.n.loteId === focus;
        const blocked = p.n.estado === "BLOQUEADO" && p.n.tipo !== "etapa";
        const base = blocked ? "#a3262a" : p.n.alerta ? "#c98a2b" : COLOR[p.n.tipo];
        ctx.globalAlpha = on ? 1 : 0.45;
        const g = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.25, base);
        g.addColorStop(1, "#0c1d15");
        if (on) {
          ctx.shadowColor = base;
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (p.n.id === hov?.id) {
          ctx.strokeStyle = "#f1ebe0";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (on || p.n.tipo === "lote") {
          ctx.fillStyle = "rgba(241,235,224,0.9)";
          ctx.font = `${p.n.tipo === "lote" ? 600 : 500} ${Math.max(9, 11 * (p.r / 12))}px ${family}`;
          ctx.textAlign = "center";
          ctx.fillText(p.n.label, p.x, p.y + p.r + 13);
        }
        ctx.globalAlpha = 1;
      });
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [nodos, aristas]);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Grafo de procedencia: lotes de origen, etapas de transformación y productos"
        className={cn("h-[340px] w-full touch-none rounded-2xl bg-[radial-gradient(ellipse_at_center,#1f2e26_0%,#141615_70%)] sm:h-[420px]", hover ? "cursor-pointer" : "cursor-grab")}
        onPointerMove={(e) => {
          const s = state.current;
          const p = pos(e);
          s.mouse = p;
          if (s.drag) {
            s.angle = s.drag.angle + (p.x - s.drag.x) * 0.01;
            s.tilt = Math.max(-0.2, Math.min(0.9, s.drag.tilt + (p.y - s.drag.y) * 0.006));
          }
        }}
        onPointerLeave={() => {
          state.current.mouse = null;
          state.current.drag = null;
        }}
        onPointerDown={(e) => {
          const s = state.current;
          const p = pos(e);
          s.drag = { ...p, angle: s.angle, tilt: s.tilt };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          const s = state.current;
          const p = pos(e);
          const moved = s.drag ? Math.hypot(p.x - s.drag.x, p.y - s.drag.y) : 0;
          s.drag = null;
          if (moved < 5 && hoverRef.current) onSelect(hoverRef.current.loteId);
        }}
      />

      {hover && (
        <div className="pointer-events-none absolute top-3 left-3 max-w-60 rounded-xl border border-line bg-card/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur">
          <p className="font-semibold text-ink">
            {hover.label} <span className="font-mono text-ink-soft">· {hover.loteId}</span>
          </p>
          <p className="mt-0.5 text-ink-soft">{hover.detalle}</p>
          <p className="mt-1 text-[0.65rem] text-bosque-300">Clic para analizar este lote</p>
        </div>
      )}

      <div className="absolute right-3 bottom-3 flex gap-1.5">
        <button
          onClick={() => setAuto((v) => !v)}
          className="rounded-full border border-line bg-card/90 p-2 text-ink-soft backdrop-blur transition hover:text-ink"
          aria-label={auto ? "Pausar rotación" : "Reanudar rotación"}
        >
          {auto ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <button
          onClick={() => {
            state.current.angle = -0.5;
            state.current.tilt = 0.28;
          }}
          className="rounded-full border border-line bg-card/90 p-2 text-ink-soft backdrop-blur transition hover:text-ink"
          aria-label="Restablecer vista"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[0.65rem] text-ink-soft">
        {[
          ["#d9c9b1", "Lote origen"],
          ["#3f7a5e", "Transformación"],
          ["#b88a6c", "Producto"],
          ["#c98a2b", "Merma > 15%"],
          ["#a3262a", "Bloqueado"],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}
