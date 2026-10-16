"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Calculator, ChevronDown, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { BALANCE, cop, costoUnitario, margenPct } from "@/lib/demo-data";
import { cn } from "@/lib/cn";

const RENDIMIENTO = [88, 86, 89, 84, 87, 83, 85, 80];
const SEMANAS = ["S34", "S35", "S36", "S37", "S38", "S39", "S40", "S41"];
const KG_SEMANA = [
  { s: "S34", kg: 62, origen: "Rivera" },
  { s: "S35", kg: 88, origen: "Campoalegre" },
  { s: "S36", kg: 54, origen: "Algeciras" },
  { s: "S37", kg: 96, origen: "Campoalegre" },
  { s: "S38", kg: 71, origen: "Rivera" },
  { s: "S39", kg: 49, origen: "Algeciras" },
  { s: "S40", kg: 84, origen: "Campoalegre" },
  { s: "S41", kg: 100, origen: "Rivera" },
];
const ORIGEN_COLOR: Record<string, string> = {
  Rivera: "bg-bosque",
  Campoalegre: "bg-bosque-500",
  Algeciras: "bg-tierra-300",
};

const IA = {
  resumen: "CAC001 presenta una merma superior al umbral permitido.",
  hechos: ["Entrada: 100 kg", "Salida: 80 kg", "Merma: 20%", "Umbral: 15%"],
  recomendacion: "Revisar la etapa de secado y mantener el lote pendiente hasta la decisión del administrador.",
  incertidumbres: ["No se ha confirmado si la humedad inicial se midió con el mismo equipo."],
};

export function AnalyticsSection() {
  return (
    <section id="analitica" className="relative scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>Analítica asistida</Eyebrow>
          <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
            Datos que se explican solos
          </h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-ink-soft">
            Los cálculos críticos los hace el sistema. La IA los traduce a lenguaje claro, separa hechos de interpretación y
            propone acciones; la decisión final siempre es del administrador.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <LineCard />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-4">
            <BarsCard />
          </Reveal>
          <Reveal delay={0.16} className="md:col-span-2 lg:col-span-4 lg:row-span-2">
            <AiCard />
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-2 lg:col-span-8">
            <BalanceCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("h-full rounded-[1.75rem] border border-line bg-card p-6 shadow-sm", className)}>{children}</div>;
}

function LineCard() {
  const [hover, setHover] = useState<number | null>(null);
  const w = 300;
  const h = 120;
  const min = 76;
  const max = 92;
  const pts = RENDIMIENTO.map((v, i) => [(i / (RENDIMIENTO.length - 1)) * w, h - ((v - min) / (max - min)) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const shown = hover ?? RENDIMIENTO.length - 1;

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Rendimiento de proceso</h3>
        <span className="font-mono text-xs text-ink-soft">{SEMANAS[shown]}</span>
      </div>
      <p className="mt-1 text-3xl font-semibold text-ink">
        {RENDIMIENTO[shown]}
        <span className="text-base font-normal text-ink-soft">%</span>
      </p>
      <svg viewBox={`-6 -10 ${w + 12} ${h + 20}`} className="mt-4 w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="rend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f7a5e" stopOpacity="0.28" />
            <stop offset="1" stopColor="#3f7a5e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={w} y1={h - ((85 - min) / (max - min)) * h} y2={h - ((85 - min) / (max - min)) * h} stroke="var(--line)" strokeDasharray="4 4" />
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#rend-fill)" />
        <motion.path
          d={line}
          fill="none"
          stroke="#3f7a5e"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        {pts.map(([x, y], i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} role="button" aria-label={`${SEMANAS[i]}: ${RENDIMIENTO[i]}%`} className="cursor-pointer outline-none">
            <rect x={x - w / 16} y={-10} width={w / 8} height={h + 20} fill="transparent" />
            <circle cx={x} cy={y} r={i === shown ? 5 : 3} fill={i === shown ? "#1b3d2e" : "#3f7a5e"} stroke="var(--card)" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <p className="mt-3 text-[0.7rem] text-ink-soft">Línea punteada: meta de 85%. Pasa el cursor por cada semana.</p>
    </Card>
  );
}

function BarsCard() {
  const [hover, setHover] = useState<number | null>(null);
  const maxKg = Math.max(...KG_SEMANA.map((d) => d.kg));
  const shown = hover ?? KG_SEMANA.length - 1;
  const total = KG_SEMANA.reduce((a, d) => a + d.kg, 0);

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Kilos recibidos</h3>
        <span className="font-mono text-xs text-ink-soft">{total} kg · 8 sem</span>
      </div>
      <p className="mt-1 text-3xl font-semibold text-ink">
        {KG_SEMANA[shown].kg}
        <span className="text-base font-normal text-ink-soft"> kg · {KG_SEMANA[shown].origen}</span>
      </p>
      <div className="mt-4 flex h-[136px] items-end gap-2" onMouseLeave={() => setHover(null)}>
        {KG_SEMANA.map((d, i) => (
          <button
            key={d.s}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onClick={() => setHover(i)}
            aria-label={`${d.s}: ${d.kg} kg de ${d.origen}`}
            className="group flex h-full flex-1 flex-col justify-end"
          >
            <motion.span
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: `${(d.kg / maxKg) * 100}%` }}
              className={cn(
                "block w-full origin-bottom rounded-t-lg transition-opacity",
                ORIGEN_COLOR[d.origen],
                i === shown ? "opacity-100" : "opacity-45 group-hover:opacity-80",
              )}
            />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] text-ink-soft">
        {Object.entries(ORIGEN_COLOR).map(([o, c]) => (
          <span key={o} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", c)} /> {o}
          </span>
        ))}
      </div>
    </Card>
  );
}

function AiCard() {
  const [state, setState] = useState<"idle" | "thinking" | "done">("idle");
  const [visible, setVisible] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    timers.current.forEach(clearTimeout);
    setState("thinking");
    setVisible(0);
    timers.current = [
      setTimeout(() => setState("done"), 1100),
      ...[1, 2, 3, 4].map((n) => setTimeout(() => setVisible(n), 1100 + n * 380)),
    ];
  };

  return (
    <Card className="flex flex-col bg-bosque text-crema">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-crema/10">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Asistente de análisis</h3>
          <p className="text-[0.7rem] text-crema/60">Explicación de alertas · Ollama</p>
        </div>
      </div>

      <div className="mt-6 flex-1 rounded-2xl bg-bosque-950/40 p-4 text-sm">
        {state === "idle" && (
          <p className="leading-relaxed text-crema/75">
            Pide una explicación de la alerta activa del lote <span className="font-mono text-crema">CAC001</span>. Verás los
            hechos medidos separados de la interpretación.
          </p>
        )}
        {state === "thinking" && (
          <p className="flex items-center gap-2 text-crema/75">
            <Loader2 className="size-4 animate-spin" /> Analizando eventos del lote…
          </p>
        )}
        {state === "done" && (
          <div className="space-y-4">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold">
              {IA.resumen}
            </motion.p>
            <AnimatePresence>
              {visible >= 1 && (
                <motion.div key="hechos" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-crema/55 uppercase">Hechos</p>
                  <ul className="mt-2 grid grid-cols-2 gap-1.5">
                    {IA.hechos.map((h) => (
                      <li key={h} className="rounded-lg bg-crema/10 px-2.5 py-1.5 font-mono text-[0.7rem]">
                        {h}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {visible >= 2 && (
                <motion.div key="severidad" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                  <span className="rounded-full bg-cereza px-2.5 py-0.5 text-[0.62rem] font-bold tracking-wider">SEVERIDAD ALTA</span>
                </motion.div>
              )}
              {visible >= 3 && (
                <motion.div key="recomendacion" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-crema/55 uppercase">Recomendación</p>
                  <p className="mt-1 text-xs leading-relaxed text-crema/85">{IA.recomendacion}</p>
                </motion.div>
              )}
              {visible >= 4 && (
                <motion.div key="incertidumbre" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-crema/55 uppercase">Incertidumbre</p>
                  <p className="mt-1 text-xs leading-relaxed text-crema/70">{IA.incertidumbres[0]}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-crema/10 px-3 py-2 text-[0.7rem] text-crema/80">
        <BadgeCheck className="size-4 shrink-0 text-[#9fd3b1]" />
        Hechos verificados contra los registros del lote. Modo demo con datos sintéticos.
      </div>

      <button
        onClick={run}
        disabled={state === "thinking"}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-crema px-5 py-3 text-sm font-semibold text-bosque transition hover:bg-white disabled:opacity-70"
      >
        {state === "done" ? <RotateCcw className="size-4" /> : <Sparkles className="size-4" />}
        {state === "done" ? "Volver a analizar" : "Explicar alerta de CAC001"}
      </button>
    </Card>
  );
}

function BalanceCard() {
  const [open, setOpen] = useState(false);
  const cu = costoUnitario();
  const margen = margenPct();

  return (
    <Card className="grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
      <div>
        <p className="text-xs font-medium text-ink-soft">Costo unitario</p>
        <p className="mt-1 text-3xl font-semibold text-ink">
          {cop.format(cu)}
          <span className="text-sm font-normal text-ink-soft"> /kg</span>
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-ink-soft">Margen estimado</p>
        <p className="mt-1 text-3xl font-semibold text-bosque-500 dark:text-bosque-300">{margen}%</p>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 self-start rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition hover:border-bosque-300 sm:self-center"
      >
        <Calculator className="size-4" /> Ver supuestos
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden sm:col-span-3"
          >
            <div className="grid gap-3 rounded-2xl bg-surface-2 p-4 font-mono text-[0.72rem] text-ink-soft sm:grid-cols-2">
              <p>
                costo unitario = costo total / kg vendibles
                <br />= {cop.format(BALANCE.costoTotalCop)} / {BALANCE.kgVendibles} kg = <span className="text-ink">{cop.format(cu)}</span>
              </p>
              <p>
                margen = (precio − costo) / precio
                <br />= ({cop.format(BALANCE.precioVentaKgCop)} − {cop.format(cu)}) / {cop.format(BALANCE.precioVentaKgCop)} ={" "}
                <span className="text-ink">{margen}%</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
