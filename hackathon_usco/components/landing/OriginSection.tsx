"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { cn } from "@/lib/cn";

const STORIES = [
  { img: "/media/rama-frutos.jpg", tag: "Cosecha", title: "Frutos maduros, recogidos a mano", lugar: "Rivera, Huila", lote: "CAC001" },
  { img: "/media/paisaje-montanas.jpg", tag: "Origen", title: "Fincas de montaña entre la neblina", lugar: "Algeciras, Huila", lote: "CAC003" },
  { img: "/media/cafetal.jpg", tag: "Cultivo", title: "Cultivo bajo sombra y suelo vivo", lugar: "Campoalegre, Huila", lote: "CAC002" },
  { img: "/media/paisaje-derecha.jpg", tag: "Beneficio", title: "Secado al sol de la mañana", lugar: "Rivera, Huila", lote: "CAC001" },
];

export function OriginSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const card = track.children[0] as HTMLElement | undefined;
      if (!card) return;
      setActive(Math.round(track.scrollLeft / (card.offsetWidth + 16)));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const go = (index: number) => {
    const track = trackRef.current;
    const card = track?.children[0] as HTMLElement | undefined;
    if (!track || !card) return;
    const clamped = (index + STORIES.length) % STORIES.length;
    track.scrollTo({ left: clamped * (card.offsetWidth + 16), behavior: "smooth" });
  };

  return (
    <section id="origen" className="relative mx-auto grid max-w-6xl scroll-mt-24 items-center gap-12 px-5 pt-36 pb-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:pt-44">
      <Reveal>
        <Eyebrow>Verde bosque · Huila</Eyebrow>
        <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
          Del origen al mundo, <span className="font-light text-bosque-500 dark:text-bosque-300">lote por lote.</span>
        </h2>
        <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
          ORIVIA une la recepción, la transformación, el inventario y los costos de la asociación en una sola historia:
          clara para el operador, controlable para el administrador y verificable para quien compra.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#trazabilidad"
            className="group inline-flex items-center gap-2 rounded-full bg-bosque px-6 py-3 text-sm font-semibold text-crema shadow-lg shadow-bosque/20 transition hover:bg-bosque-700"
          >
            Ver la trazabilidad <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </a>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <MapPin className="size-3.5" /> 3 municipios · 330 kg recibidos
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.15} className="min-w-0">
        <div
          ref={trackRef}
          className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {STORIES.map((s, i) => (
            <article
              key={s.title}
              className="group relative aspect-[4/5] w-[72%] shrink-0 snap-start overflow-hidden rounded-[1.75rem] bg-bosque-900 shadow-xl shadow-black/10 sm:w-[44%]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${s.img})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bosque-950/90 via-bosque-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-crema">
                <span className="rounded-full bg-crema/15 px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.2em] uppercase backdrop-blur">
                  {s.tag}
                </span>
                <h3 className="mt-3 text-base leading-snug font-semibold">{s.title}</h3>
                <p className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-crema/75">
                  <MapPin className="size-3" /> {s.lugar} · Lote {s.lote}
                </p>
              </div>
              <span className="sr-only">
                Historia {i + 1} de {STORIES.length}
              </span>
            </article>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5" role="tablist" aria-label="Historias">
            {STORIES.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={i === active}
                aria-label={`Ver historia ${i + 1}`}
                onClick={() => go(i)}
                className={cn("h-1.5 rounded-full transition-all", i === active ? "w-8 bg-bosque" : "w-3 bg-line")}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => go(active - 1)}
              aria-label="Historia anterior"
              className="rounded-full border border-line bg-card p-2.5 text-ink transition hover:border-bosque-300"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              onClick={() => go(active + 1)}
              aria-label="Historia siguiente"
              className="rounded-full bg-bosque p-2.5 text-crema transition hover:bg-bosque-700"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
