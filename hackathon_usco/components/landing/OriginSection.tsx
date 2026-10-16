"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { cn } from "@/lib/cn";

const STORIES = [
  { img: "/media/cosecha-mano.jpg", tag: "Cosecha", title: "Cosecha a mano, fruto por fruto de cacao", lugar: "Rivera, Huila", lote: "CAC001" },
  { img: "/media/mazorcas-arbol.jpg", tag: "Cultivo", title: "Frutos de cacao que nacen del tronco", lugar: "Algeciras, Huila", lote: "CAC003" },
  { img: "/media/paisaje-cacao.jpg", tag: "Origen", title: "Cacaotales entre la neblina", lugar: "Campoalegre, Huila", lote: "CAC002" },
  { img: "/media/mazorca-abierta.jpg", tag: "Beneficio", title: "Granos frescos listos para fermentar", lugar: "Rivera, Huila", lote: "CAC001" },
  { img: "/media/cacaotal.jpg", tag: "Territorio", title: "Sombra, montaña y suelo vivo", lugar: "Algeciras, Huila", lote: "CAC003" },
];
const N = STORIES.length;

/** Distancia circular más corta entre la tarjeta i y la activa. */
const offsetOf = (i: number, active: number) => {
  let d = i - active;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  return d;
};

export function OriginSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const go = (n: number) => setActive((a) => (a + n + N) % N);

  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => setActive((a) => (a + 1) % N), 4800);
    return () => clearInterval(t);
  }, [paused, reduce]);

  return (
    <section id="origen" className="relative mx-auto grid max-w-6xl scroll-mt-6 sm:scroll-mt-8 lg:scroll-mt-10 items-center gap-10 px-5 pt-20 pb-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:pt-24 lg:pb-24">
      <Reveal className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <Eyebrow>Cacao del Huila</Eyebrow>
        <h2 className="mt-5 max-w-sm text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
          Del origen al mundo, <span className="font-light text-tierra">lote por lote.</span>
        </h2>
        <p className="mt-6 max-w-[330px] sm:max-w-[420px] lg:max-w-[320px] xl:max-w-[350px] text-[0.93rem] leading-relaxed text-ink-soft">
          ORIVIA une la recepción, la fermentación, el secado, el inventario y los costos de la asociación cacaotera en una sola
          historia: clara para el operador, controlable para el administrador y verificable para quien compra.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <a
            href="#proceso"
            className="group inline-flex items-center gap-2 rounded-full bg-bosque px-6 py-3 text-sm font-semibold text-crema shadow-lg shadow-bosque/20 transition hover:bg-bosque-700"
          >
            Ver el proceso <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </a>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <MapPin className="size-3.5" /> Rivera · Campoalegre · Algeciras
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.15} className="min-w-0">
        <div
          className="relative h-[420px] select-none [perspective:1400px] sm:h-[480px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          tabIndex={0}
          role="region"
          aria-roledescription="carrusel"
          aria-label="Historias de origen del cacao"
        >
          <motion.div
            className="absolute inset-0 cursor-grab touch-pan-y [transform-style:preserve-3d] active:cursor-grabbing"
            onPanEnd={(_, info) => {
              if (info.offset.x < -40) go(1);
              else if (info.offset.x > 40) go(-1);
            }}
          >
            {STORIES.map((s, i) => {
              const d = offsetOf(i, active);
              const abs = Math.abs(d);
              return (
                <motion.article
                  key={s.title}
                  onClick={() => d !== 0 && setActive(i)}
                  animate={{
                    x: `${d * 58}%`,
                    z: -abs * 180,
                    rotateY: -d * 34,
                    scale: 1 - abs * 0.06,
                    opacity: abs > 2 ? 0 : 1 - abs * 0.22,
                  }}
                  transition={{ type: "spring", stiffness: 140, damping: 22 }}
                  style={{ zIndex: 10 - abs }}
                  className={cn(
                    "absolute top-0 left-1/2 -ml-[clamp(120px,21vw,170px)] h-full w-[clamp(240px,42vw,340px)] overflow-hidden rounded-[2rem] bg-bosque-900 shadow-2xl shadow-black/30",
                    d !== 0 && "cursor-pointer",
                  )}
                  aria-hidden={d !== 0}
                >
                  <motion.div
                    animate={{ scale: d === 0 ? 1.06 : 1.18 }}
                    transition={{ duration: 6, ease: "linear" }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${s.img})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bosque-950/95 via-bosque-950/25 to-transparent" />
                  {/* Brillo dorado sobre la tarjeta activa */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(226,184,110,0.35),transparent_45%)] transition-opacity duration-700",
                      d === 0 ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-crema">
                    <span className="rounded-full bg-crema/15 px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.2em] uppercase backdrop-blur">{s.tag}</span>
                    <h3 className="mt-3 text-lg leading-snug font-semibold">{s.title}</h3>
                    <p className="mt-1.5 flex items-center gap-1 text-[0.72rem] text-crema/75">
                      <MapPin className="size-3" /> {s.lugar} · Lote {s.lote}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5" role="tablist" aria-label="Historias">
            {STORIES.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={i === active}
                aria-label={`Ver historia ${i + 1}: ${s.title}`}
                onClick={() => setActive(i)}
                className={cn("h-1.5 rounded-full transition-all", i === active ? "w-8 bg-bosque" : "w-3 bg-line")}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => go(-1)} aria-label="Historia anterior" className="rounded-full border border-line bg-card p-2.5 text-ink transition hover:border-bosque-300">
              <ArrowLeft className="size-4" />
            </button>
            <button onClick={() => go(1)} aria-label="Historia siguiente" className="rounded-full bg-bosque p-2.5 text-crema transition hover:bg-bosque-700">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
