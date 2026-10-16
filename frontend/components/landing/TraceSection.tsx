"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, MapPin, PackageCheck, Scale, Sprout, Sun, Timer, UserRound } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { LOTES, MERMA_UMBRAL, mermaPct, type LotId } from "@/lib/demo-data";
import type { Role } from "@/components/auth/roles";
import { cn } from "@/lib/cn";

const ETAPAS = {
  recepcion: { icon: Sprout, img: "/media/cacao/traza-recepcion.jpg", alt: "Sacos de cacao pesados en el centro de acopio" },
  fermentacion: { icon: Timer, img: "/media/cacao/traza-fermentacion.jpg", alt: "Volteo de granos en el cajón de fermentación" },
  secado: { icon: Sun, img: "/media/cacao/finca-secado.jpg", alt: "Granos secándose en marquesina solar" },
  producto: { icon: PackageCheck, img: "/media/cacao/producto-seco.jpg", alt: "Cacao seco listo para la venta" },
} as const;

const STATE_STYLES = {
  PENDIENTE: "bg-ambar/90 text-carbon",
  LIBERADO: "bg-bosque-500/90 text-crema",
  BLOQUEADO: "bg-cereza/90 text-crema",
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
  const etapa = ETAPAS[step.key as keyof typeof ETAPAS];
  const merma = mermaPct(lot);
  const alerta = merma > MERMA_UMBRAL;

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const fotoY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const panelY = useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, -30]);

  const pickLot = (id: LotId) => {
    setLotId(id);
    setStepIndex(0);
  };

  return (
    <section ref={ref} id="trazabilidad" className="relative scroll-mt-20 overflow-hidden px-5 py-24 sm:px-8">
      {/* Fondo: resplandor cálido que acompaña al panel */}
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 -left-40 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(226,184,110,0.18),transparent_65%)] blur-2xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div style={{ y: panelY }} className="order-2 lg:order-1">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-line bg-card shadow-[0_30px_80px_-30px_rgba(16,38,28,0.45)]">
              {/* Foto de la etapa */}
              <div className="relative aspect-[16/9] overflow-hidden bg-bosque-900 sm:aspect-[16/8]">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={`${step.key}`}
                    initial={{ opacity: 0, scale: 1.12 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <motion.div
                      role="img"
                      aria-label={etapa.alt}
                      style={{ y: fotoY, backgroundImage: `url(${etapa.img})` }}
                      className="absolute -inset-y-[10%] inset-x-0 bg-cover bg-center"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-bosque-950/90 via-bosque-950/20 to-bosque-950/30" />

                {/* Lotes con indicador deslizante */}
                <div className="absolute top-4 right-4 left-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1 rounded-full bg-bosque-950/45 p-1 backdrop-blur-md" role="tablist" aria-label="Lotes">
                    {LOTES.map((l) => (
                      <button
                        key={l.id}
                        role="tab"
                        aria-selected={l.id === lotId}
                        onClick={() => pickLot(l.id)}
                        className={cn("relative rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors", l.id === lotId ? "text-bosque" : "text-crema/80 hover:text-crema")}
                      >
                        {l.id === lotId && <motion.span layoutId="lote-activo" className="absolute inset-0 rounded-full bg-crema" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                        <span className="relative">{l.id}</span>
                      </button>
                    ))}
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-[0.62rem] font-bold tracking-wider backdrop-blur", STATE_STYLES[lot.estado])}>{lot.estado}</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${lotId}-${stepIndex}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 text-crema"
                  >
                    <div>
                      <p className="flex items-center gap-1 text-[0.68rem] text-crema/75">
                        <MapPin className="size-3" /> {lot.finca} · {lot.origen}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{step.etapa}</p>
                    </div>
                    <p className="text-right font-mono">
                      <span className="block text-3xl font-semibold sm:text-4xl">{step.kg}</span>
                      <span className="text-[0.65rem] tracking-widest text-crema/70">KG</span>
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="p-5 sm:p-7">
                {/* Línea horizontal de etapas */}
                <ol className="relative grid grid-cols-4 gap-2">
                  <div aria-hidden="true" className="absolute top-5 right-[12.5%] left-[12.5%] h-[3px] rounded-full bg-line" />
                  <motion.div
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: "-20% 0px" }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-5 left-[12.5%] h-[3px] w-[75%] origin-left rounded-full bg-bosque-300/40"
                  />
                  <motion.div
                    aria-hidden="true"
                    className="absolute top-5 left-[12.5%] h-[3px] origin-left rounded-full bg-gradient-to-r from-bosque-500 to-[#e2b86e]"
                    style={{ width: "75%" }}
                    animate={{ scaleX: stepIndex / (lot.pasos.length - 1) }}
                    transition={{ type: "spring", stiffness: 110, damping: 20 }}
                  />
                  {lot.pasos.map((p, i) => {
                    const Icon = ETAPAS[p.key as keyof typeof ETAPAS].icon;
                    const selected = i === stepIndex;
                    const done = i <= stepIndex;
                    return (
                      <motion.li
                        key={p.key}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.25 + i * 0.12, duration: 0.5 }}
                        className="relative flex flex-col items-center text-center"
                      >
                        <button
                          onClick={() => setStepIndex(i)}
                          aria-pressed={selected}
                          aria-label={`${p.etapa}: ${p.kg} kg`}
                          className={cn(
                            "relative z-10 grid size-10 place-items-center rounded-full border-2 transition duration-300 hover:scale-110",
                            done ? "border-bosque-500 bg-bosque text-crema" : "border-line bg-card text-ink-soft hover:border-bosque-300",
                          )}
                        >
                          {selected && <span className="absolute inset-0 animate-ping rounded-full bg-bosque-500/30" />}
                          <Icon className="relative size-4" />
                        </button>
                        <span className={cn("mt-2 text-[0.68rem] font-semibold sm:text-xs", selected ? "text-ink" : "text-ink-soft")}>{p.etapa}</span>
                        {/* Masa relativa a lo recibido */}
                        <span className="mt-1.5 h-1 w-10 overflow-hidden rounded-full bg-line sm:w-14">
                          <motion.span
                            className="block h-full rounded-full bg-tierra-300"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(p.kg / lot.recibidoKg) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + i * 0.12, duration: 0.8 }}
                            key={`${lotId}-${p.key}`}
                          />
                        </span>
                        <span className="mt-1 font-mono text-[0.62rem] text-ink-soft">{p.kg} kg</span>
                      </motion.li>
                    );
                  })}
                </ol>

                {/* Detalle del evento */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${lotId}-${stepIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="mt-6 grid gap-3 rounded-2xl bg-surface-2 p-4 text-xs sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-tierra-300" /> {step.fecha}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 text-tierra-300" /> {step.responsable}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Scale className="size-3.5 text-tierra-300" /> {step.kg} kg
                        </span>
                      </div>
                      <p className="mt-2 leading-relaxed text-ink">{step.nota}</p>
                    </div>
                    <span className="self-start rounded-md bg-card px-2 py-1 font-mono text-[0.6rem] text-ink-soft">evento #{huella(`${lot.id}${step.key}${step.kg}${step.fecha}`)}</span>
                  </motion.div>
                </AnimatePresence>

                <div className={cn("mt-3 flex items-start gap-3 rounded-2xl px-4 py-3 text-xs leading-relaxed", alerta ? "bg-ambar/12 text-ink" : "bg-bosque-500/10 text-ink")}>
                  {alerta ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bosque-500" />}
                  <p>
                    <span className="font-semibold">Merma {merma}%</span> (entrada {lot.recibidoKg} kg → salida {lot.pasos[lot.pasos.length - 1].kg} kg).{" "}
                    {alerta ? `Supera el umbral de ${MERMA_UMBRAL}%: el lote queda pendiente de revisión.` : `Dentro del umbral de ${MERMA_UMBRAL}%.`}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </motion.div>

        <Reveal delay={0.1} className="order-1 flex flex-col items-center text-center lg:order-2 lg:items-start lg:text-left">
          <Eyebrow>Del lote al producto</Eyebrow>
          <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
            Trazabilidad <span className="font-light text-tierra">agroindustrial</span>
          </h2>
          <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
            Cada kilo queda conectado con su productor, su finca y cada transformación. Elige un lote y recorre su historia paso a paso.
          </p>
          <ul className="mt-7 space-y-3 text-left text-sm text-ink">
            {["Recepción con validación de cantidades y lote único", "Transformaciones que no consumen más de lo disponible", "Alertas automáticas cuando la merma supera el 15%"].map((t, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bosque-500" />
                {t}
              </motion.li>
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
