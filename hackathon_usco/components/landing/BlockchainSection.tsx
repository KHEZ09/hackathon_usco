"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ExternalLink, Fingerprint, MapPin } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { TiltCard } from "./TiltCard";
import { LOTES, type DemoLot } from "@/lib/demo-data";
import { EvidenceDialog } from "@/components/evidence/EvidenceDialog";
import { cn } from "@/lib/cn";

const PRODUCTOS = [
  { lot: "CAC002", nombre: "Cacao seco premium", img: "/media/mazorca-abierta.jpg", notas: "Notas a frutos rojos y panela" },
  { lot: "CAC003", nombre: "Cacao fino de aroma", img: "/media/mazorcas-arbol.jpg", notas: "Floral, acidez brillante" },
  { lot: "CAC001", nombre: "Cacao de montaña", img: "/media/cosecha-mano.jpg", notas: "Cuerpo alto, final a nuez" },
] as const;



export function BlockchainSection() {
  const [openLot, setOpenLot] = useState<DemoLot | null>(null);
  const closeLot = useCallback(() => setOpenLot(null), []);

  return (
    <section id="productos" className="relative scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Cadena de evidencia</Eyebrow>
            <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
              Productos verificables en blockchain
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[0.95rem] leading-relaxed text-ink-soft">
              Cada evento del lote se encadena con el anterior mediante SHA-256: <span className="font-mono text-xs">hash_n =
              SHA256(evento_n + hash_n-1)</span>. Si alguien cambia un dato, la cadena deja de coincidir con el ancla
              publicada. La ficha pública muestra origen, proceso y estado; nunca costos ni márgenes.
            </p>
          </Reveal>
        </div>

        <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {PRODUCTOS.map((p, i) => {
            const lot = LOTES.find((l) => l.id === p.lot)!;
            return (
              <Reveal key={p.lot} delay={i * 0.08} className="w-[82%] shrink-0 snap-center md:w-auto">
                <TiltCard className="h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-sm transition-shadow group-hover:shadow-2xl">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${p.img})` }}
                    />
                    <span
                      className={cn(
                        "absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.6rem] font-bold tracking-wider backdrop-blur",
                        lot.estado === "LIBERADO" ? "bg-bosque/85 text-crema" : "bg-ambar/90 text-carbon",
                      )}
                    >
                      {lot.estado === "LIBERADO" ? "LIBERADO" : "EN REVISIÓN"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-mono text-[0.68rem] text-ink-soft">Lote {lot.id}</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{p.nombre}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                      <MapPin className="size-3" /> {lot.finca} · {lot.origen}, Huila
                    </p>
                    <p className="mt-3 text-xs text-ink-soft">{p.notas}</p>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                      <button
                        onClick={() => setOpenLot(lot)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-bosque px-3 py-2.5 text-xs font-semibold text-crema transition hover:bg-bosque-700"
                      >
                        <Fingerprint className="size-4" /> Verificar hash
                      </button>
                      <Link
                        href={`/ficha/${lot.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-3 py-2.5 text-xs font-semibold text-ink transition hover:border-bosque-300"
                      >
                        <ExternalLink className="size-4" /> Ficha QR
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
