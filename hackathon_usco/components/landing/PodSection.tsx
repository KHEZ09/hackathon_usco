"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Droplets, Leaf, Package, QrCode as QrIcon, Share2, Sun, type LucideIcon } from "lucide-react";
import { OriviaIsotipo } from "@/components/brand/OriviaLogo";
import { CACAO_STAGES, STAGE_RANGES, type ProcessStage } from "@/data/cacaoProcessData";
import { CacaoLeaf } from "./Botanica";
import { EscenaCosecha, EscenaEmpaque, EscenaFermentacion, EscenaSecado } from "./proceso/Escenas";
import { EscenaQr } from "./proceso/EscenaQr";
import { Caligrafia } from "./proceso/Caligrafia";
import { AccionEtapa } from "./proceso/AccionEtapa";
import { cn } from "@/lib/cn";

const ICONOS: Record<ProcessStage["id"], LucideIcon> = {
  cosecha: Leaf,
  fermentacion: Droplets,
  secado: Sun,
  empaque: Package,
  verificacion: QrIcon,
};

const etapa = (id: ProcessStage["id"]) => CACAO_STAGES.find((s) => s.id === id)!;

const MOTAS = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 1.5 + (i % 3),
  delay: (i * 0.8) % 12,
  duration: 10 + (i % 5) * 2.5,
}));

/**
 * "Del grano al producto": recorrido scroll-world del cacao. Todo el contenido sale de
 * data/cacaoProcessData.ts; cada etapa combina capas fotográficas, vectores y partículas con física.
 */
export function PodSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [activa, setActiva] = useState(0);

  useMotionValueEvent(p, "change", (v) => {
    const i = STAGE_RANGES.findIndex(([a, b]) => v >= a && v < b);
    setActiva(i === -1 ? CACAO_STAGES.length - 1 : i);
  });

  const irA = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(CACAO_STAGES.length - 1, i));
    const top = el.getBoundingClientRect().top + window.scrollY;
    const recorrido = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + recorrido * (STAGE_RANGES[destino][0] + 0.06), behavior: "smooth" });
  };

  const hojas = useTransform(p, [0.2, 0.32], [0, 1]);
  const hojasY = useTransform(p, [0, 1], ["10%", "-25%"]);

  return (
    <section ref={ref} id="proceso" aria-label="Del grano al producto" className="relative h-[620svh] px-3 sm:px-6">
      <div className="sticky top-3 h-[calc(100svh-1.5rem)] overflow-hidden rounded-[2.5rem] bg-[#121211] text-crema">
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

        {/* El secado ocupa todo el escenario, como el plano completo del video */}
        <EscenaSecado p={p} stage={etapa("secado")} />

        {/* Escenas centrales */}
        <div className="absolute inset-x-0 top-28 bottom-[42%] lg:inset-y-0 lg:left-[24%] lg:right-[26%]">
          <EscenaCosecha p={p} stage={etapa("cosecha")} />
          <EscenaFermentacion p={p} stage={etapa("fermentacion")} />
          <EscenaEmpaque p={p} stage={etapa("empaque")} fondo={etapa("secado")} />
          <EscenaQr p={p} />
        </div>

        {/* Hojas de cacao en los bordes, desenfocadas */}
        <motion.div aria-hidden="true" style={{ opacity: hojas, y: hojasY }} className="pointer-events-none absolute inset-0">
          <CacaoLeaf tone="profundo" className="absolute top-[4%] -left-24 w-80 rotate-[35deg] opacity-70 blur-[3px]" />
          <CacaoLeaf tone="medio" className="absolute top-[40%] -right-28 hidden w-96 -scale-x-100 -rotate-[20deg] opacity-60 blur-[4px] sm:block" />
          <CacaoLeaf tone="profundo" className="absolute -bottom-10 -left-16 w-72 -rotate-[15deg] opacity-60 blur-[5px]" />
          <CacaoLeaf tone="medio" className="absolute -top-10 right-[20%] hidden w-64 rotate-[160deg] opacity-40 blur-[6px] lg:block" />
        </motion.div>

        <button
          onClick={() => irA(activa - 1)}
          aria-label="Etapa anterior"
          className="absolute top-1/2 left-[25%] z-10 hidden -translate-y-1/2 rounded-full p-2 text-crema/70 transition hover:bg-crema/10 hover:text-crema lg:block"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          onClick={() => irA(activa + 1)}
          aria-label="Etapa siguiente"
          className="absolute top-1/2 right-4 z-10 hidden -translate-y-1/2 rounded-full p-2 text-crema/70 transition hover:bg-crema/10 hover:text-crema lg:block"
        >
          <ChevronRight className="size-6" />
        </button>

        <Stepper activa={activa} onIr={irA} />
        <Panel activa={activa} p={p} />
        <Progreso p={p} activa={activa} onIr={irA} />
      </div>
    </section>
  );
}

function Stepper({ activa, onIr }: { activa: number; onIr: (i: number) => void }) {
  return (
    <nav aria-label="Etapas del proceso" className="absolute top-20 left-4 z-10 sm:left-8 lg:top-1/2 lg:w-[22%] lg:-translate-y-1/2">
      <p className="mb-3 hidden text-[0.65rem] font-semibold tracking-[0.25em] text-crema/60 uppercase lg:block">Recorrido · lote CAC001</p>
      <ol className="relative flex gap-1.5 overflow-x-auto pr-4 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible lg:pr-0">
        <span aria-hidden="true" className="absolute top-5 bottom-5 left-[1.15rem] hidden w-px bg-crema/15 lg:block" />
        {CACAO_STAGES.map((s, i) => {
          const esActiva = i === activa;
          const hecha = i < activa || (i === CACAO_STAGES.length - 1 && esActiva);
          const Icono = ICONOS[s.id];
          return (
            <li key={s.id} className="relative shrink-0">
              <button
                onClick={() => onIr(i)}
                aria-current={esActiva ? "step" : undefined}
                aria-label={`Paso ${s.stepNumber}: ${s.label}`}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all duration-500",
                  esActiva ? "bg-arena text-bosque shadow-[0_8px_24px_rgba(217,201,177,0.25)]" : "text-crema/70 hover:bg-crema/[0.06] hover:text-crema",
                  !esActiva && "max-lg:hidden",
                )}
              >
                <span className={cn("relative grid size-7 shrink-0 place-items-center rounded-full border transition", esActiva ? "border-bosque/30 bg-bosque/10" : "border-crema/20 bg-[#121211]")}>
                  <Icono className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.label}</span>
                  {s.subLabel && <span className="block text-[0.65rem] opacity-70">{s.subLabel}</span>}
                </span>
                {hecha && <Check className={cn("size-3.5", esActiva ? "text-bosque" : "text-[#9fd3b1]")} />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Panel({ activa, p }: { activa: number; p: MotionValue<number> }) {
  const s = CACAO_STAGES[activa];
  return (
    <div className="absolute inset-x-5 bottom-20 z-10 sm:inset-x-8 lg:top-1/2 lg:right-8 lg:bottom-auto lg:left-auto lg:w-[24%] lg:-translate-y-1/2">
      {s.id === "verificacion" ? (
        <Caligrafia p={p} stage={s} />
      ) : (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl bg-[#121211]/55 p-4 backdrop-blur-sm lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        >
          {s.badgeText && <p className="text-[0.62rem] font-semibold tracking-[0.28em] text-[#f3c77e] uppercase">{s.badgeText}</p>}
          <h3 className="mt-2 text-2xl leading-tight font-semibold sm:text-3xl">{s.title}</h3>
          <p className="mt-3 text-[0.8rem] leading-relaxed text-crema/70">{s.description}</p>
          <div className="mt-5 flex items-center gap-2">
            <AccionEtapa stage={s} />
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

function Progreso({ p, activa, onIr }: { p: MotionValue<number>; activa: number; onIr: (i: number) => void }) {
  const ancho = useTransform(p, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);
  return (
    <div className="absolute inset-x-5 bottom-5 z-10 flex items-center gap-4 sm:inset-x-8">
      <span className="hidden text-[0.62rem] tracking-[0.2em] text-crema/50 uppercase sm:block">Del grano al producto</span>
      <div className="relative h-px flex-1 bg-crema/15">
        <motion.div style={{ width: ancho }} className="absolute inset-y-0 left-0 bg-[#d9c9b1]" />
        <motion.span style={{ left: ancho }} className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-arena shadow-[0_0_10px_rgba(217,201,177,0.8)]" />
      </div>
      <div className="flex gap-1.5">
        {CACAO_STAGES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onIr(i)}
            aria-label={`Ir a ${s.label}`}
            className={cn("h-1.5 rounded-full transition-all duration-500", i === activa ? "w-6 bg-arena" : "w-1.5 bg-crema/30 hover:bg-crema/60")}
          />
        ))}
      </div>
      <span className="hidden items-center gap-1.5 text-[0.62rem] text-crema/60 sm:flex">
        <OriviaIsotipo className="h-4" glow={false} /> ORIVIA · Huila
      </span>
    </div>
  );
}
