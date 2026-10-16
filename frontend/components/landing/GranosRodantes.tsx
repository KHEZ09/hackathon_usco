"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { CacaoBean } from "./Botanica";

/**
 * Granos de cacao que ruedan por los márgenes de las secciones claras al hacer scroll.
 *
 * - Solo viven en las secciones de SECCIONES (nunca en el proceso ni en el footer).
 * - En cada sección se mide dónde terminan textos, títulos, imágenes y controles; los granos
 *   recorren únicamente el espacio libre a los lados. Si no hay espacio, no aparecen.
 * - Cada grano sigue un camino aleatorio (pero estable) y gira según la distancia recorrida,
 *   como si rodara por la pared; la sombra de contacto no gira.
 */

const SECCIONES = ["origen", "trazabilidad", "analitica", "historia", "productos"];
const MARGEN = 14; // separación mínima con el contenido y el borde de la pantalla (px)
const MUESTRAS = 48;

type Punto = { x: number; y: number };
type Grano = {
  id: string;
  seccion: string;
  tam: number;
  variante: 1 | 2 | 3;
  puntos: Punto[]; // camino en coordenadas de <main>
  largo: number[]; // largo acumulado para el giro
  desfase: number;
  velocidad: number;
  giro: 1 | -1;
};

function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const semilla = (texto: string) => [...texto].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

type Caja = { left: number; top: number; right: number; bottom: number };

/** Cajas del contenido visible de un elemento (texto, imágenes, gráficos, controles). */
function cajasDeContenido(raiz: Element, base: DOMRect): Caja[] {
  const cajas: Caja[] = [];
  const ancho = window.innerWidth;
  raiz.querySelectorAll<HTMLElement | SVGElement>("*").forEach((el) => {
    const estilo = getComputedStyle(el);
    if (estilo.visibility === "hidden" || estilo.display === "none" || Number(estilo.opacity) === 0) return;
    const conTexto = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    const visual =
      el instanceof HTMLImageElement ||
      el instanceof HTMLCanvasElement ||
      el instanceof HTMLButtonElement ||
      el instanceof HTMLInputElement ||
      el.tagName.toLowerCase() === "svg" ||
      el.getAttribute("role") === "img" ||
      estilo.backgroundImage.includes("url(");
    // Tarjetas y paneles con fondo propio también cuentan como contenido.
    const panel = estilo.backgroundColor !== "rgba(0, 0, 0, 0)" && estilo.backgroundColor !== "transparent";
    if (!conTexto && !visual && !panel) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.width >= ancho * 0.96) return; // fondos de ancho completo no cuentan
    cajas.push({ left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top });
  });
  return cajas;
}

function caminos(main: HTMLElement): Grano[] {
  const base = main.getBoundingClientRect();
  const ancho = window.innerWidth;
  const granos: Grano[] = [];
  // Obstáculos fuera de las secciones (p. ej. la rama decorativa que cruza el borde de <main>).
  const obstaculos = [...main.children].filter((c) => !c.matches("section, footer") && !c.hasAttribute("data-granos")).flatMap((c) => cajasDeContenido(c, base));

  for (const id of SECCIONES) {
    const sec = document.getElementById(id);
    if (!sec) continue;
    const r = sec.getBoundingClientRect();
    const top = r.top - base.top;
    const bottom = r.bottom - base.top;
    const contenido = cajasDeContenido(sec, base);
    if (!contenido.length) continue;
    const izquierda = Math.min(...contenido.map((c) => c.left));
    const derecha = Math.max(...contenido.map((c) => c.right));
    const libres = [
      { lado: "izq", desde: MARGEN, hasta: izquierda - MARGEN },
      { lado: "der", desde: derecha + MARGEN, hasta: ancho - MARGEN },
    ];
    const rnd = azar(semilla(id));
    for (const zona of libres) {
      const hueco = zona.hasta - zona.desde;
      if (hueco < 30) continue;
      const cuantos = Math.max(1, Math.min(4, Math.floor((bottom - top) / 260)));
      for (let k = 0; k < cuantos; k++) {
        const tam = Math.round(Math.min(hueco - 6, 18 + rnd() * 18));
        if (tam < 16) continue;
        const xMin = zona.desde;
        const xMax = zona.hasta - tam;
        const tramo = (bottom - top) / cuantos;
        const y0 = top + tramo * k + rnd() * tramo * 0.3;
        const alto = tam * 1.3;
        const y1 = Math.min(bottom - alto, y0 + tramo * (0.7 + rnd() * 0.6));
        const sube = rnd() > 0.5;
        const [ya, yb] = sube ? [y1, y0] : [y0, y1];
        const xa = xMin + rnd() * (xMax - xMin);
        const xb = xMin + rnd() * (xMax - xMin);
        const ondas = 1 + rnd() * 2;
        const fase = rnd() * Math.PI * 2;
        const puntos: Punto[] = [];
        for (let i = 0; i <= MUESTRAS; i++) {
          const t = i / MUESTRAS;
          const x = xa + (xb - xa) * t + Math.sin(t * Math.PI * ondas + fase) * (xMax - xMin) * 0.35;
          puntos.push({ x: Math.min(xMax, Math.max(xMin, x)), y: ya + (yb - ya) * t });
        }
        // Nunca sobre el contenido ni sobre obstáculos.
        const choca = puntos.some((p) =>
          [...contenido, ...obstaculos].some((c) => p.x < c.right + 6 && p.x + tam > c.left - 6 && p.y < c.bottom + 6 && p.y + alto > c.top - 6),
        );
        if (choca) continue;
        const largo = [0];
        for (let i = 1; i < puntos.length; i++) largo.push(largo[i - 1] + Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y));
        granos.push({
          id: `${id}-${zona.lado}-${k}`,
          seccion: id,
          tam,
          variante: ((Math.floor(rnd() * 3) % 3) + 1) as 1 | 2 | 3,
          puntos,
          largo,
          desfase: rnd() * 0.25,
          velocidad: 0.8 + rnd() * 0.5,
          giro: rnd() > 0.5 ? 1 : -1,
        });
      }
    }
  }
  return granos;
}

export function GranosRodantes({ mainRef }: { mainRef: RefObject<HTMLElement | null> }) {
  const reduce = useReducedMotion();
  const [granos, setGranos] = useState<Grano[]>([]);
  const refs = useRef(new Map<string, HTMLDivElement>());

  // Medir el espacio libre al cargar, al cambiar el tamaño y cuando terminan las animaciones de entrada.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || reduce) return;
    let t: ReturnType<typeof setTimeout>;
    const medir = () => {
      clearTimeout(t);
      t = setTimeout(() => setGranos(caminos(main)), 250);
    };
    medir();
    const tardio = setTimeout(medir, 2500);
    const ro = new ResizeObserver(medir);
    ro.observe(main);
    window.addEventListener("resize", medir);
    return () => {
      clearTimeout(t);
      clearTimeout(tardio);
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [mainRef, reduce]);

  // Posición y giro guiados por el scroll de cada sección (reversible).
  useEffect(() => {
    if (!granos.length) return;
    let raf = 0;
    const pintar = () => {
      raf = 0;
      const vh = window.innerHeight;
      const progreso = new Map<string, number>();
      for (const id of SECCIONES) {
        const sec = document.getElementById(id);
        if (!sec) continue;
        const r = sec.getBoundingClientRect();
        progreso.set(id, Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))));
      }
      for (const g of granos) {
        const el = refs.current.get(g.id);
        if (!el) continue;
        const p = Math.min(1, Math.max(0, ((progreso.get(g.seccion) ?? 0) - g.desfase) * g.velocidad * 1.25));
        const f = p * MUESTRAS;
        const i = Math.min(MUESTRAS - 1, Math.floor(f));
        const u = f - i;
        const a = g.puntos[i];
        const b = g.puntos[i + 1];
        const x = a.x + (b.x - a.x) * u;
        const y = a.y + (b.y - a.y) * u;
        const recorrido = g.largo[i] + (g.largo[i + 1] - g.largo[i]) * u;
        // Rodar: ángulo = distancia recorrida ÷ radio (en grados), con sentido propio de cada grano.
        const angulo = ((recorrido / (g.tam / 2)) * 180 * g.giro) / Math.PI;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        const cuerpo = el.firstElementChild as HTMLElement | null;
        if (cuerpo) cuerpo.style.transform = `rotate(${angulo}deg)`;
      }
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(pintar);
    };
    pintar();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
    };
  }, [granos]);

  if (reduce) return null;

  return (
    <div data-granos aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {granos.map((g) => (
        <div
          key={g.id}
          ref={(el) => {
            if (el) refs.current.set(g.id, el);
            else refs.current.delete(g.id);
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ width: g.tam, height: g.tam * 1.28 }}
        >
          <div className="size-full">
            <CacaoBean variant={g.variante} className="size-full drop-shadow-none" />
          </div>
          {/* Sombra de contacto con la pared: no gira con el grano */}
          <span className="absolute -bottom-1 left-1/2 h-1.5 w-3/4 -translate-x-1/2 rounded-full bg-[#2a1608]/25 blur-[3px]" />
        </div>
      ))}
    </div>
  );
}
