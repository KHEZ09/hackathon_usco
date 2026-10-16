"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/cn";

const FRASES = [
  { frase: "Cada grano tiene una historia", firma: "Del origen al mundo" },
  { frase: "Trazabilidad que se siente", firma: "Hecho en el Huila" },
  { frase: "Del origen al mundo", firma: "Asociación cacaotera" },
];

const COSECHA = [40, 58, 46, 72, 64, 88, 76];

export function StoryBanner() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % FRASES.length), 5200);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section id="historia" className="scroll-mt-20 px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_280px]">
        <Reveal>
          <div
            className="relative isolate flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[2rem] bg-bosque-900 p-7 text-crema sm:p-10"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-55"
              style={{ backgroundImage: "url(/media/cacaotal.jpg)" }}
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-bosque-950/90 via-bosque-950/55 to-bosque-950/25" />

            <p className="text-[0.65rem] font-light tracking-[0.4em]">PRODUCT STORY-TELLING</p>

            <div className="my-8 min-h-[140px]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={i}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="font-script text-5xl leading-[1.1] sm:text-7xl">{FRASES[i].frase}</p>
                  <footer className="mt-4 text-[0.65rem] font-light tracking-[0.36em] text-crema/70 uppercase">
                    {FRASES[i].firma}
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <a
                href="#productos"
                className="group inline-flex items-center gap-2 rounded-full bg-bosque-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-bosque-700"
              >
                Conocer los productos <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </a>
              <div className="flex gap-1.5">
                {FRASES.map((f, n) => (
                  <button
                    key={f.frase}
                    onClick={() => setI(n)}
                    aria-label={`Mostrar frase ${n + 1}`}
                    aria-current={n === i}
                    className={cn("h-1.5 rounded-full transition-all", n === i ? "w-8 bg-crema" : "w-3 bg-crema/35")}
                  />
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Reveal delay={0.1}>
            <div className="h-full rounded-[1.75rem] bg-carbon p-6 text-crema">
              <p className="text-xs font-semibold">Cosecha 2026</p>
              <p className="mt-1 text-[0.7rem] text-crema/60">Kilos acopiados por mes</p>
              <div className="mt-5 flex h-20 items-end gap-1.5">
                {COSECHA.map((v, n) => (
                  <motion.span
                    key={n}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: n * 0.06, duration: 0.6 }}
                    style={{ height: `${v}%` }}
                    className="flex-1 origin-bottom rounded-t bg-gradient-to-t from-bosque-500 to-[#9fd3b1]"
                  />
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="flex h-full flex-col justify-between gap-4 rounded-[1.75rem] bg-tierra p-6 text-crema">
              <ShieldCheck className="size-7" />
              <div>
                <p className="text-sm font-semibold">Verificable en blockchain</p>
                <p className="mt-1 text-[0.72rem] leading-relaxed text-crema/75">
                  Cada evento deja una huella criptográfica encadenada que delata cualquier alteración.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
