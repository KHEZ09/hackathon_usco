"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Leaf, MapPin, QrCode, Route, Sun, Timer } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { TiltCard } from "./TiltCard";
import { LOTES, type DemoLot } from "@/lib/demo-data";
import { rutaFicha } from "@/lib/enlaces";
import { EvidenceDialog } from "@/components/evidence/EvidenceDialog";
import { cn } from "@/lib/cn";

const PRODUCTOS = [
  {
    lot: "CAC002",
    nombre: "Cacao seco premium",
    img: "/media/cacao/producto-seco.jpg",
    alt: "Granos de cacao fermentados y secos, algunos abiertos",
    descripcion: "Grano fermentado y secado al sol, listo para chocolatería.",
    notas: ["Frutos rojos", "Panela"],
    proceso: [{ icon: Timer, t: "5 días de fermentación" }, { icon: Sun, t: "Secado en marquesina" }],
    presentacion: "Saco de fique · 50 kg",
  },
  {
    lot: "CAC003",
    nombre: "Cacao fino de aroma",
    img: "/media/cacao/producto-aroma.jpg",
    alt: "Granos tostados y nibs de cacao en un tazón con flores",
    descripcion: "Granos tostados y nibs de perfil floral, para barras de origen.",
    notas: ["Floral", "Acidez brillante"],
    proceso: [{ icon: Timer, t: "6 días de fermentación" }, { icon: Leaf, t: "Tostión suave" }],
    presentacion: "Nibs y grano · 1 kg",
  },
  {
    lot: "CAC001",
    nombre: "Cacao de montaña",
    img: "/media/cacao/producto-montana.jpg",
    alt: "Trozos de chocolate oscuro con granos y mazorca frente a las montañas del Huila",
    descripcion: "Chocolate de origen único cultivado entre montañas del Huila.",
    notas: ["Cuerpo alto", "Final a nuez"],
    proceso: [{ icon: Timer, t: "6 días de fermentación" }, { icon: Sun, t: "Secado solar" }],
    presentacion: "Barra 70 % · 100 g",
  },
] as const;

export function BlockchainSection() {
  const [openLot, setOpenLot] = useState<DemoLot | null>(null);
  const closeLot = useCallback(() => setOpenLot(null), []);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <section ref={ref} id="productos" className="relative scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-end gap-8 text-center lg:grid-cols-2 lg:text-left">
          <Reveal className="flex flex-col items-center lg:items-start">
            <Eyebrow>Nuestros cacaos</Eyebrow>
            <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
              Cacao del Huila <span className="font-light text-tierra">con historia de origen</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto max-w-xl text-[0.95rem] leading-relaxed text-ink-soft lg:mx-0">
              Cada producto nace de un lote con nombre propio. Conoce su finca, cómo se fermentó y se secó, y en qué estado está. Con el
              QR, quien compra ve ese mismo recorrido, sin costos internos ni datos privados.
            </p>
          </Reveal>
        </div>

        <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {PRODUCTOS.map((p, i) => {
            const lot = LOTES.find((l) => l.id === p.lot)!;
            return (
              <Reveal key={p.lot} delay={i * 0.1} className="w-[82%] shrink-0 snap-center md:w-auto">
                <TiltCard className="h-full">
                  <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-sm transition-shadow duration-500 group-hover:shadow-2xl">
                    <FotoProducto p={p} indice={i} progreso={scrollYProgress} estado={lot.estado} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[0.68rem] text-ink-soft">Lote {lot.id}</p>
                        <p className="text-[0.65rem] font-medium text-tierra dark:text-tierra-300">{p.presentacion}</p>
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-ink">{p.nombre}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                        <MapPin className="size-3" /> {lot.finca} · {lot.origen}, Huila
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-ink-soft">{p.descripcion}</p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.notas.map((n) => (
                          <span key={n} className="rounded-full bg-tierra/10 px-2.5 py-1 text-[0.65rem] font-medium text-tierra dark:text-tierra-300">
                            {n}
                          </span>
                        ))}
                      </div>
                      <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                        {p.proceso.map(({ icon: Icono, t }) => (
                          <li key={t} className="flex items-center gap-2 text-[0.7rem] text-ink-soft">
                            <Icono className="size-3.5 text-bosque-500" /> {t}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                        <button
                          onClick={() => setOpenLot(lot)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-bosque px-3 py-2.5 text-xs font-semibold text-crema transition hover:bg-bosque-700"
                        >
                          <Route className="size-4" /> Ver recorrido
                        </button>
                        <Link
                          href={rutaFicha(lot.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-3 py-2.5 text-xs font-semibold text-ink transition hover:border-bosque-300"
                        >
                          <QrCode className="size-4" /> Ficha QR
                        </Link>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>

      <EvidenceDialog
        open={!!openLot}
        entityId={openLot?.id ?? ""}
        title={openLot ? `Lote ${openLot.id} · ${openLot.finca}` : ""}
        steps={openLot?.pasos ?? []}
        onClose={closeLot}
      />
    </section>
  );
}

function FotoProducto({
  p,
  indice,
  progreso,
  estado,
}: {
  p: (typeof PRODUCTOS)[number];
  indice: number;
  progreso: MotionValue<number>;
  estado: DemoLot["estado"];
}) {
  // Parallax distinto por tarjeta: las fotos se desplazan a ritmos diferentes con el scroll.
  const y = useTransform(progreso, [0, 1], [`${-6 - indice * 2}%`, `${6 + indice * 2}%`]);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-bosque-900">
      <motion.div
        role="img"
        aria-label={p.alt}
        style={{ y, backgroundImage: `url(${p.img})` }}
        className="absolute -inset-y-[12%] inset-x-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bosque-950/50 via-transparent to-transparent" />
      {/* Destello que cruza la foto al pasar el cursor */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-crema/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      <span
        className={cn(
          "absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.6rem] font-bold tracking-wider backdrop-blur",
          estado === "LIBERADO" ? "bg-bosque/85 text-crema" : "bg-ambar/90 text-carbon",
        )}
      >
        {estado === "LIBERADO" ? "DISPONIBLE" : "EN REVISIÓN"}
      </span>
    </div>
  );
}
