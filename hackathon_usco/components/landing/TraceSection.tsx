"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, PackageCheck, Scale, Sprout, Sun, Timer, UserRound } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { LOTES, MERMA_UMBRAL, mermaPct, type LotId } from "@/lib/demo-data";
import type { Role } from "@/components/auth/roles";
import { cn } from "@/lib/cn";

const STEP_ICONS = { recepcion: Sprout, fermentacion: Timer, secado: Sun, producto: PackageCheck } as const;

const STATE_STYLES = {
  PENDIENTE: "bg-ambar/15 text-ambar",
  LIBERADO: "bg-bosque-500/15 text-bosque-500 dark:text-bosque-300",
  BLOQUEADO: "bg-cereza/15 text-cereza",
} as const;

/** Huella corta y determinística para mostrar en la interfaz (no criptográfica). */
function huella(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function TraceSection({ onLogin }: { onLogin: (role?: Role) => void }) {
  const [lotId, setLotId] = useState<LotId>("CAC001");
  const [stepIndex, setStepIndex] = useState(0);
  const lot = LOTES.find((l) => l.id === lotId)!;
  const step = lot.pasos[stepIndex];
  const merma = mermaPct(lot);
  const alerta = merma > MERMA_UMBRAL;

  const pickLot = (id: LotId) => {
    setLotId(id);
    setStepIndex(0);
  };

  return (
    <section id="trazabilidad" className="relative scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal className="order-2 lg:order-1">
          <div className="relative rounded-[2rem] bg-surface-2 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5 rounded-full bg-card p-1 shadow-sm" role="tablist" aria-label="Lotes">
                {LOTES.map((l) => (
                  <button
                    key={l.id}
                    role="tab"
                    aria-selected={l.id === lotId}
                    onClick={() => pickLot(l.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition",
                      l.id === lotId ? "bg-bosque text-crema" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {l.id}
                  </button>
                ))}
              </div>
              <span className={cn("rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wider", STATE_STYLES[lot.estado])}>
                {lot.estado}
              </span>
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              <span className="font-semibold text-ink">{lot.finca}</span> · {lot.productor} · {lot.origen}
            </p>

            {/* Diagrama de flujo */}
            <ol className="relative mt-6 grid grid-cols-4 gap-2">
              <div aria-hidden="true" className="absolute top-6 right-[12.5%] left-[12.5%] h-0.5 bg-line" />
              <motion.div
                aria-hidden="true"
                className="absolute top-6 left-[12.5%] h-0.5 origin-left bg-bosque-500"
                style={{ width: "75%" }}
                animate={{ scaleX: stepIndex / (lot.pasos.length - 1) }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
              {lot.pasos.map((p, i) => {
                const Icon = STEP_ICONS[p.key as keyof typeof STEP_ICONS];
                const selected = i === stepIndex;
                const done = i <= stepIndex;
                return (
                  <li key={p.key} className="relative flex flex-col items-center text-center">
                    <button
                      onClick={() => setStepIndex(i)}
                      aria-pressed={selected}
                      aria-label={`${p.etapa}: ${p.kg} kg`}
                      className={cn(
                        "relative z-10 grid size-12 place-items-center rounded-full border-2 transition",
                        done ? "border-bosque-500 bg-bosque text-crema" : "border-line bg-card text-ink-soft hover:border-bosque-300",
                        selected && "ring-4 ring-bosque-500/20",
                      )}
                    >
                      <Icon className="size-5" />
                    </button>
                    <span className="mt-2 text-[0.7rem] font-semibold text-ink sm:text-xs">{p.etapa}</span>
                    <span className="font-mono text-[0.65rem] text-ink-soft">{p.kg} kg</span>
                  </li>
                );
              })}
            </ol>

            {/* Detalle del paso */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${lotId}-${stepIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-6 rounded-2xl bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {step.etapa} · <span className="font-mono">{lot.id}</span>
                  </h3>
                  <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[0.62rem] text-ink-soft">
                    evento #{huella(`${lot.id}${step.key}${step.kg}${step.fecha}`)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-ink-soft">
                    <CalendarDays className="size-4 text-tierra-300" />
                    <span>{step.fecha}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-soft">
                    <UserRound className="size-4 text-tierra-300" />
                    <span>{step.responsable}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-soft">
                    <Scale className="size-4 text-tierra-300" />
                    <span>{step.kg} kg</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-soft">{step.nota}</p>
              </motion.div>
            </AnimatePresence>

            <div
              className={cn(
                "mt-4 flex items-start gap-3 rounded-2xl px-4 py-3 text-xs leading-relaxed",
                alerta ? "bg-ambar/12 text-ink" : "bg-bosque-500/10 text-ink",
              )}
            >
              {alerta ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bosque-500" />
              )}
              <p>
                <span className="font-semibold">Merma {merma}%</span> (entrada {lot.recibidoKg} kg → salida{" "}
                {lot.pasos[lot.pasos.length - 1].kg} kg).{" "}
                {alerta
                  ? `Supera el umbral de ${MERMA_UMBRAL}%: el lote queda pendiente de revisión.`
                  : `Dentro del umbral de ${MERMA_UMBRAL}%.`}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <Eyebrow>Verde bosque</Eyebrow>
          <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
            Trazabilidad agroindustrial
          </h2>
          <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
            Cada kilo queda conectado con su productor, su finca y cada transformación. Elige un lote y recorre su historia
            paso a paso.
          </p>
          <ul className="mt-7 space-y-3 text-sm text-ink">
            {[
              "Recepción con validación de cantidades y lote único",
              "Transformaciones que no consumen más de lo disponible",
              "Alertas automáticas cuando la merma supera el 15%",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bosque-500" />
                {t}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onLogin("operador")}
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-bosque px-6 py-3 text-sm font-semibold text-crema shadow-lg shadow-bosque/20 transition hover:bg-bosque-700"
          >
            Registrar un lote <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}
