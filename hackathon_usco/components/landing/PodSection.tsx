"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Droplets, Leaf, Package, QrCode as QrIcon, Share2, Sun } from "lucide-react";
import { OriviaIsotipo } from "@/components/brand/OriviaLogo";
import { CacaoLeaf } from "./Botanica";
import { ETAPAS_RANGO, EscenaCosecha, EscenaEmpaque, EscenaFermentacion, EscenaQr, EscenaSecado, useLocal } from "./proceso/Escenas";
import { cn } from "@/lib/cn";

const ETAPAS = [
  {
    icon: Leaf,
    paso: "Finca La Esperanza",
    sub: "(Cosecha)",
    eyebrow: "Rivera, Huila · lote CAC001",
    titulo: "Del grano al producto",
    texto: "Cada mazorca se cosecha madura y se registra con su productor, finca y fecha. Ese es el primer eslabón de su historia.",
    cta: { label: "Ver trazabilidad", href: "#trazabilidad" },
  },
  {
    icon: Droplets,
    paso: "Fermentación",
    eyebrow: "Beneficio · 6 días",
    titulo: "Fermentación en cajón",
    texto: "Los granos frescos pasan a cajones de madera. El operador registra entrada, salida e incidencias de cada etapa.",
    cta: { label: "Registrar una etapa", href: "#trazabilidad" },
  },
  {
    icon: Sun,
    paso: "Secado",
    eyebrow: "Secado solar",
    titulo: "Del 55% al 7% de humedad",
    texto: "Mientras el grano seca, ORIVIA calcula la merma y alerta si supera el 15%.",
    cta: { label: "Ver alertas", href: "#analitica" },
  },
  {
    icon: Package,
    paso: "Empaque",
    eyebrow: "Sellado",
    titulo: "Empaque con huella",
    sub2: "SHA-256 por lote",
    texto: "El lote se empaca y su historial queda encadenado: cualquier alteración posterior se detecta.",
    cta: { label: "Verificar un producto", href: "#productos" },
  },
  {
    icon: QrIcon,
    paso: "QR verificable",
    eyebrow: "Ficha pública",
    titulo: "Cada grano tiene una historia",
    texto: "",
    cta: { label: "Abrir ficha CAC001", href: "/ficha/CAC001" },
  },
] as const;

const MOTAS = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 1.5 + (i % 3),
  delay: (i * 0.8) % 12,
  duration: 10 + (i % 5) * 2.5,
}));

/**
 * "Del grano al producto": recorrido scroll-world del cacao en cinco etapas
 * (cosecha → fermentación → secado → empaque → QR verificable). Las fotos son capas fijas;
 * stepper, textos, granos, vapor, destellos, anillo, sello y QR son componentes animados por el scroll.
 */
export function PodSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [etapa, setEtapa] = useState(0);

  useMotionValueEvent(p, "change", (v) => {
    const i = ETAPAS_RANGO.findIndex(([a, b]) => v >= a && v < b);
    setEtapa(i === -1 ? ETAPAS.length - 1 : i);
  });

  const irA = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(ETAPAS.length - 1, i));
    const top = el.getBoundingClientRect().top + window.scrollY;
    const recorrido = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + recorrido * (ETAPAS_RANGO[destino][0] + 0.06), behavior: "smooth" });
  };

  const hojas = useTransform(p, [0.2, 0.32], [0, 1]);
  const hojasY = useTransform(p, [0, 1], ["10%", "-25%"]);

  return (
    <section ref={ref} id="proceso" aria-label="Del grano al producto" className="relative h-[620svh] px-3 sm:px-6">
      <div className="sticky top-3 h-[calc(100svh-1.5rem)] overflow-hidden rounded-[2.5rem] bg-[#121211] text-crema">
        {/* Atmósfera: resplandor y partículas doradas */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_45%,rgba(201,138,43,0.12),transparent_60%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {MOTAS.map((m, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-[#f6e3b0] shadow-[0_0_6px_1px_rgba(246,227,176,0.5)] animate-mote"
              style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, animationDelay: `${-m.delay}s`, animationDuration: `${m.duration}s` }}
            />
          ))}
        </div>

        {/* Escenas */}
        <div className="absolute inset-x-0 top-28 bottom-[42%] lg:inset-y-0 lg:left-[24%] lg:right-[26%]">
          <EscenaCosecha p={p} />
          <EscenaFermentacion p={p} />
          <EscenaEmpaque p={p} />
          <EscenaQr p={p} />
        </div>
        <EscenaSecadoFull p={p} />

        {/* Hojas de cacao en los bordes, desenfocadas */}
        <motion.div aria-hidden="true" style={{ opacity: hojas, y: hojasY }} className="pointer-events-none absolute inset-0">
          <CacaoLeaf tone="profundo" className="absolute top-[4%] -left-24 w-80 rotate-[35deg] opacity-70 blur-[3px]" />
          <CacaoLeaf tone="medio" className="absolute top-[40%] -right-28 hidden w-96 -scale-x-100 -rotate-[20deg] opacity-60 blur-[4px] sm:block" />
          <CacaoLeaf tone="profundo" className="absolute -bottom-10 -left-16 w-72 -rotate-[15deg] opacity-60 blur-[5px]" />
          <CacaoLeaf tone="medio" className="absolute -top-10 right-[20%] hidden w-64 rotate-[160deg] opacity-40 blur-[6px] lg:block" />
        </motion.div>

        {/* Flechas: etapa anterior / siguiente */}
        <button
          onClick={() => irA(etapa - 1)}
          aria-label="Etapa anterior"
          className="absolute top-1/2 left-[25%] hidden -translate-y-1/2 rounded-full p-2 text-crema/70 transition hover:bg-crema/10 hover:text-crema lg:block"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          onClick={() => irA(etapa + 1)}
          aria-label="Etapa siguiente"
          className="absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-full p-2 text-crema/70 transition hover:bg-crema/10 hover:text-crema lg:block"
        >
          <ChevronRight className="size-6" />
        </button>

        <Stepper etapa={etapa} onIr={irA} />
        <Panel etapa={etapa} p={p} />
        <Progreso p={p} etapa={etapa} onIr={irA} />
      </div>
    </section>
  );
}

/** El secado ocupa todo el escenario, como el plano completo del video. */
function EscenaSecadoFull({ p }: { p: MotionValue<number> }) {
  return (
    <div className="absolute inset-0">
      <EscenaSecado p={p} />
    </div>
  );
}

function Stepper({ etapa, onIr }: { etapa: number; onIr: (i: number) => void }) {
  return (
    <nav aria-label="Etapas del proceso" className="absolute top-20 left-4 z-10 sm:left-8 lg:top-1/2 lg:w-[22%] lg:-translate-y-1/2">
      <p className="mb-3 hidden text-[0.65rem] font-semibold tracking-[0.25em] text-crema/60 uppercase lg:block">Recorrido · lote CAC001</p>
      <ol className="relative flex gap-1.5 overflow-x-auto pr-4 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible lg:pr-0">
        <span aria-hidden="true" className="absolute top-5 bottom-5 left-[1.15rem] hidden w-px bg-crema/15 lg:block" />
        {ETAPAS.map((e, i) => {
          const activa = i === etapa;
          const hecha = i < etapa || (i === ETAPAS.length - 1 && activa);
          return (
            <li key={e.paso} className="relative shrink-0">
              <button
                onClick={() => onIr(i)}
                aria-current={activa ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all duration-500",
                  activa ? "bg-arena text-bosque shadow-[0_8px_24px_rgba(217,201,177,0.25)]" : "text-crema/70 hover:bg-crema/[0.06] hover:text-crema",
                  !activa && "max-lg:hidden",
                )}
              >
                <span
                  className={cn(
                    "relative grid size-7 shrink-0 place-items-center rounded-full border transition",
                    activa ? "border-bosque/30 bg-bosque/10" : "border-crema/20 bg-[#121211]",
                  )}
                >
                  <e.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{e.paso}</span>
                  {"sub" in e && <span className="block text-[0.65rem] opacity-70">{e.sub}</span>}
                </span>
                {hecha && <Check className={cn("size-3.5", activa ? "text-bosque" : "text-[#9fd3b1]")} />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Panel({ etapa, p }: { etapa: number; p: MotionValue<number> }) {
  const e = ETAPAS[etapa];
  return (
    <div className="absolute inset-x-5 bottom-20 z-10 sm:inset-x-8 lg:top-1/2 lg:right-8 lg:bottom-auto lg:left-auto lg:w-[24%] lg:-translate-y-1/2">
      {etapa === ETAPAS.length - 1 ? (
        <Caligrafia p={p} />
      ) : (
        <motion.div key={etapa} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="rounded-2xl bg-[#121211]/55 p-4 backdrop-blur-sm lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <p className="text-[0.62rem] font-semibold tracking-[0.28em] text-[#f3c77e] uppercase">{e.eyebrow}</p>
          <h3 className="mt-2 text-2xl leading-tight font-semibold sm:text-3xl">{e.titulo}</h3>
          {"sub2" in e && <p className="text-xl font-light text-crema/85 sm:text-2xl">{e.sub2}</p>}
          <p className="mt-3 text-[0.8rem] leading-relaxed text-crema/70">{e.texto}</p>
          <div className="mt-5 flex items-center gap-2">
            <a href={e.cta.href} className="inline-flex items-center gap-1.5 rounded-full border border-crema/40 px-4 py-2 text-xs font-semibold transition hover:bg-crema hover:text-bosque">
              {e.cta.label} <ArrowUpRight className="size-3.5" />
            </a>
            <CompartirBtn />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CompartirBtn() {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        const url = `${window.location.origin}/ficha/CAC001`;
        try {
          if (navigator.share) await navigator.share({ title: "ORIVIA · Del grano al producto", url });
          else await navigator.clipboard.writeText(url);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          // el usuario canceló
        }
      }}
      aria-label="Compartir la ficha del lote"
      className="grid size-8 place-items-center rounded-full border border-crema/30 text-crema/80 transition hover:bg-crema/10"
    >
      {ok ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
    </button>
  );
}

/** "Cada grano tiene una historia" escrito a mano: se revela con el scroll y se traza el subrayado. */
function Caligrafia({ p }: { p: MotionValue<number> }) {
  const local = useLocal(p, 4);
  const revela = useTransform(local, [0.15, 0.6], [100, 0]);
  const clip = useTransform(revela, (v) => `inset(0 ${v}% 0 0)`);
  const trazo = useTransform(local, [0.5, 0.8], [0, 1]);
  const cta = useTransform(local, [0.7, 0.85], [0, 1]);
  return (
    <div>
      <motion.p style={{ clipPath: clip }} className="font-script text-5xl leading-[1.05] text-crema sm:text-6xl lg:text-[3.1rem] xl:text-[3.6rem]">
        Cada grano tiene una historia
      </motion.p>
      <svg viewBox="0 0 300 50" className="mt-1 w-56" aria-hidden="true">
        <motion.path
          d="M4 30 C 60 46, 120 10, 170 26 C 205 37, 225 40, 250 22 C 262 13, 276 14, 268 26 C 262 35, 280 34, 296 20"
          fill="none"
          stroke="#efe3cf"
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ pathLength: trazo }}
        />
      </svg>
      <motion.div style={{ opacity: cta }} className="mt-4">
        <Link href="/ficha/CAC001" className="inline-flex items-center gap-1.5 rounded-full bg-crema px-4 py-2 text-xs font-semibold text-bosque transition hover:bg-white">
          Abrir ficha CAC001 <ArrowUpRight className="size-3.5" />
        </Link>
      </motion.div>
    </div>
  );
}

function Progreso({ p, etapa, onIr }: { p: MotionValue<number>; etapa: number; onIr: (i: number) => void }) {
  const ancho = useTransform(p, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);
  return (
    <div className="absolute inset-x-5 bottom-5 z-10 flex items-center gap-4 sm:inset-x-8">
      <span className="hidden text-[0.62rem] tracking-[0.2em] text-crema/50 uppercase sm:block">Del grano al producto</span>
      <div className="relative h-px flex-1 bg-crema/15">
        <motion.div style={{ width: ancho }} className="absolute inset-y-0 left-0 bg-[#d9c9b1]" />
        <motion.span style={{ left: ancho }} className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-arena shadow-[0_0_10px_rgba(217,201,177,0.8)]" />
      </div>
      <div className="flex gap-1.5">
        {ETAPAS.map((e, i) => (
          <button
            key={e.paso}
            onClick={() => onIr(i)}
            aria-label={`Ir a ${e.paso}`}
            className={cn("h-1.5 rounded-full transition-all duration-500", i === etapa ? "w-6 bg-arena" : "w-1.5 bg-crema/30 hover:bg-crema/60")}
          />
        ))}
      </div>
      <span className="hidden items-center gap-1.5 text-[0.62rem] text-crema/60 sm:flex">
        <OriviaIsotipo className="h-4" glow={false} /> ORIVIA · Huila
      </span>
    </div>
  );
}
