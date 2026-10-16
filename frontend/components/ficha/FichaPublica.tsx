"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, EyeOff, Fingerprint, Leaf, MapPin, Mountain, PackageCheck, Share2, ShoppingBag, Sprout } from "lucide-react";
import { OriviaIsotipo } from "@/components/brand/OriviaLogo";
import { EvidenceDialog } from "@/components/evidence/EvidenceDialog";
import { Toaster, useToast } from "@/components/ui/Toaster";
import { QrCode } from "./QrCode";
import { fmtFecha, historia, inventario, useDatos, type Estado } from "@/lib/store";
import { cn } from "@/lib/cn";
import { rutaFicha, urlFicha } from "@/lib/enlaces";
import { getPublicLive, getPublicLot, type ApiPublicLive, type ApiPublicLot } from "@/lib/orivia-api";

const ESTADO_PUBLICO: Record<Estado, { label: string; texto: string; clase: string }> = {
  LIBERADO: { label: "Disponible", texto: "Lote liberado por control de calidad.", clase: "bg-bosque-500 text-crema" },
  PENDIENTE: { label: "En revisión", texto: "El lote está en verificación de calidad.", clase: "bg-ambar text-carbon" },
  BLOQUEADO: { label: "No disponible", texto: "Lote retenido por control de calidad. No se ofrece para pedidos.", clase: "bg-cereza text-crema" },
};

const noop = () => () => {};

export function FichaPublica({ loteId }: { loteId: string }) {
  return (
    <div data-tema="claro" className="min-h-svh bg-bosque-950">
      <Toaster>
        <Ficha loteId={loteId} />
      </Toaster>
    </div>
  );
}

function Ficha({ loteId }: { loteId: string }) {
  const datos = useDatos();
  const { notify } = useToast();
  const [verificar, setVerificar] = useState(false);
  const [publicRemote, setPublicRemote] = useState<ApiPublicLot | null>(null);
  const [liveRemote, setLiveRemote] = useState<ApiPublicLive | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const cerrar = useCallback(() => setVerificar(false), []);
  // El QR y el enlace compartido siempre apuntan a la ficha pública de este lote (nunca a localhost).
  const url = useSyncExternalStore(noop, () => urlFicha(loteId), () => "");
  const localLote = datos.lotes.find((l) => l.id === loteId);

  useEffect(() => {
    let active = true;
    Promise.all([getPublicLot(loteId), getPublicLive()])
      .then(([lot, live]) => {
        if (!active) return;
        setPublicRemote(lot);
        setLiveRemote(live);
      })
      .catch(() => {
        if (!active) return;
        setPublicRemote(null);
        setLiveRemote(null);
      })
      .finally(() => {
        if (active) setRemoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loteId]);

  const lote = localLote ?? (publicRemote ? {
    id: publicRemote.id,
    productor: publicRemote.producer,
    origen: "Rivera" as const,
    finca: publicRemote.producer,
    producto: publicRemote.product,
    recibidoKg: publicRemote.received_kg,
    fecha: publicRemote.timeline?.[0]?.occurred_at ?? new Date().toISOString(),
    estado: publicRemote.status === "BLOCKED" ? "BLOQUEADO" as const : publicRemote.status === "PENDING" ? "PENDIENTE" as const : "LIBERADO" as const,
    costoTotalCop: 0,
    precioVentaKgCop: 0,
  } : undefined);

  if (!lote) {
    if (remoteLoading) {
      return <main className="mx-auto flex min-h-svh max-w-md items-center justify-center bg-surface px-6 text-sm text-ink-soft">Consultando la ficha verificable…</main>;
    }
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center bg-surface px-6 text-center">
        <OriviaIsotipo tone="oscuro" className="h-14" />
        <h1 className="mt-6 text-xl font-semibold text-ink">No encontramos el lote {loteId}</h1>
        <p className="mt-2 text-sm text-ink-soft">Revisa el código impreso en el empaque o prueba con una ficha de ejemplo.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {datos.lotes.map((l) => (
            <Link key={l.id} href={rutaFicha(l.id)} className="rounded-full border border-line px-4 py-2 font-mono text-xs font-semibold text-ink hover:bg-surface-2">
              {l.id}
            </Link>
          ))}
        </div>
      </main>
    );
  }

  const estadoKey: Estado = publicRemote?.status === "BLOCKED"
    ? "BLOQUEADO"
    : publicRemote?.status === "PENDING"
    ? "PENDIENTE"
    : publicRemote?.status === "LIBERATED"
    ? "LIBERADO"
    : lote.estado;
  const estado = ESTADO_PUBLICO[estadoKey];
  const displayId = publicRemote?.id ?? lote.id;
  const displayProduct = publicRemote?.product ?? lote.producto;
  const displayOrigin = publicRemote?.origin ?? lote.origen;
  const displayProducer = publicRemote?.producer ?? lote.productor;
  const pasos = publicRemote?.timeline?.length
    ? publicRemote.timeline.map((event, index) => {
        const t = event.transformation;
        const estadoTexto = ESTADO_PUBLICO[(event.to === "BLOCKED" ? "BLOQUEADO" : event.to === "PENDING" ? "PENDIENTE" : "LIBERADO") as Estado].label;
        return {
          key: event.id ?? `${displayId}-${index}`,
          etapa:
            event.type === "LOT_TRANSFORMED" && t
              ? `${t.stage ?? "Transformación"} · ${t.input_kg} → ${t.output_kg} kg`
              : event.type === "LOT_STATUS_CHANGED"
              ? `Estado · ${estadoTexto}`
              : "Cosecha y recepción",
          fecha: event.occurred_at ?? new Date().toISOString(),
          kg: event.type === "LOT_TRANSFORMED" && t ? (t.output_kg ?? 0) : index === 0 ? (publicRemote.received_kg ?? 0) : (publicRemote.available_kg ?? 0),
          responsable: index === 0 ? displayProducer : event.type === "LOT_TRANSFORMED" ? "Beneficio de la asociación" : "Control de calidad",
        };
      })
    : historia(datos, lote.id);
  const producido = publicRemote ? Math.max(0, publicRemote.received_kg - publicRemote.available_kg) : inventario(datos, lote.id).producido;
  const recibido = publicRemote?.received_kg ?? inventario(datos, lote.id).recibido;
  const realHashes = publicRemote?.timeline?.map((event) => event.event_hash).filter((hash): hash is string => Boolean(hash)) ?? [];
  const realEvidence = publicRemote && realHashes.length === publicRemote.timeline?.length
    ? {
        hashes: realHashes,
        verified: publicRemote.history_verified === true,
        certificate: publicRemote.timeline?.at(-1)?.blockchain ?? null,
      }
    : undefined;

  const compartir = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `ORIVIA · ${displayProduct}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify("exito", "Enlace copiado", "Comparte la ficha pública de este lote.");
    } catch {
      notify("info", "No se compartió", "Puedes copiar la dirección desde el navegador.");
    }
  };

  const pedir = () => {
    if (estadoKey !== "LIBERADO") {
      notify("error", "Pedido no disponible", `${estado.texto} Solo los productos liberados pueden pedirse.`);
      return;
    }
    notify("exito", "Solicitud preparada", `El lote ${displayId} está liberado. El pedido se enviará desde el panel operativo autenticado.`);
  };

  return (
    <div className="relative">
      <div aria-hidden="true" className="fixed inset-0 bg-cover bg-center opacity-40 blur-2xl" style={{ backgroundImage: "url(/media/hero-poster.jpg)" }} />
      <main className="relative mx-auto min-h-svh max-w-md overflow-hidden bg-surface shadow-2xl sm:my-8 sm:min-h-0 sm:rounded-[2.5rem]">
        {/* Cabecera */}
        <header className="relative h-72 overflow-hidden">
          <motion.div
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-cover bg-[center_35%]"
            style={{ backgroundImage: "url(/media/cacaotal.jpg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bosque-950/60 via-bosque-950/10 to-surface" />
          <div className="relative flex items-center justify-between p-5 text-crema">
            <Link href="/" aria-label="Ir al inicio de ORIVIA" className="flex items-center gap-2">
              <OriviaIsotipo className="h-8" />
              <span className="text-sm font-light tracking-[0.3em]">ORIVIA</span>
            </Link>
            <span className="rounded-full bg-crema/15 px-3 py-1 text-[0.6rem] font-semibold tracking-[0.2em] uppercase backdrop-blur">Ficha pública</span>
          </div>
        </header>

        <div className="relative -mt-24 px-5 pb-10">
          <div className="rounded-[1.75rem] bg-card p-5 shadow-xl shadow-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.7rem] text-ink-soft">Lote {displayId}</p>
                <h1 className="mt-1 text-2xl leading-tight font-semibold text-ink">{displayProduct}</h1>
              </div>
              <span className={cn("shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wider", estado.clase)}>{estado.label}</span>
            </div>
            <p className="mt-2 text-xs text-ink-soft">{estado.texto}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: MapPin, k: "Origen", v: displayOrigin },
                { icon: Mountain, k: "Finca", v: displayProducer.replace("Finca ", "") },
                { icon: Leaf, k: "Productor", v: displayProducer },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl bg-surface-2 px-2 py-3">
                  <x.icon className="mx-auto size-4 text-bosque-500" />
                  <p className="mt-1.5 text-[0.6rem] tracking-wider text-ink-soft uppercase">{x.k}</p>
                  <p className="mt-0.5 text-[0.72rem] font-semibold text-ink">{x.v}</p>
                </div>
              ))}
            </div>
          </div>

          {publicRemote && (
            <section className="mt-4 rounded-[1.5rem] border border-bosque-500/20 bg-bosque-500/[0.05] p-4">
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-bosque-500 uppercase">Catálogo público verificado</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">La ficha se lee directamente de la API pública persistida; la cadena y el anclaje se muestran sin exponer datos privados.</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.7rem]">
                <div><dt className="text-ink-soft">Código</dt><dd className="font-mono font-semibold text-ink">{publicRemote.id}</dd></div>
                <div><dt className="text-ink-soft">Producto</dt><dd className="font-semibold text-ink">{publicRemote.product}</dd></div>
                <div><dt className="text-ink-soft">Proveedor</dt><dd className="font-semibold text-ink">{publicRemote.producer}</dd></div>
                <div><dt className="text-ink-soft">Estado de cadena</dt><dd className="font-semibold text-bosque-500">{publicRemote.history_verified ? "Íntegra" : "Revisar"}</dd></div>
              </dl>
              {realEvidence?.certificate && (
                <p className="mt-3 rounded-xl bg-bosque-500/10 px-3 py-2 text-[0.68rem] text-bosque-700">
                  Anclaje real: {String(realEvidence.certificate.network ?? "EVM")} · {realEvidence.certificate.verified ? "verificado" : "pendiente"}
                </p>
              )}
            </section>
          )}

          {liveRemote && (
            <section className="mt-3 rounded-2xl border border-line bg-card px-4 py-3 text-[0.68rem] text-ink-soft">
              <span className="font-semibold text-ink">API en vivo:</span> {liveRemote.status} · blockchain {String(liveRemote.capabilities?.blockchain?.backend ?? "no informado")} · IA {String(liveRemote.capabilities?.ai?.model ?? "no informado")}
            </section>
          )}

          <p className="mt-8 text-center font-script text-4xl text-bosque">Cada grano tiene una historia</p>

          {/* Línea de tiempo */}
          <section aria-labelledby="historia" className="mt-6">
            <h2 id="historia" className="text-xs font-semibold tracking-[0.25em] text-ink-soft uppercase">
              Trazabilidad
            </h2>
            <ol className="relative mt-4 space-y-4 border-l-2 border-dashed border-line pl-6">
              {pasos.map((p, i) => (
                <motion.li
                  key={p.key}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative"
                >
                  <span className="absolute top-1 -left-[2.1rem] grid size-6 place-items-center rounded-full bg-bosque text-crema ring-4 ring-surface">
                    {i === 0 ? <Sprout className="size-3" /> : <span className="size-1.5 rounded-full bg-crema" />}
                  </span>
                  <p className="text-sm font-semibold text-ink">{p.etapa}</p>
                  <p className="text-[0.7rem] text-ink-soft">
                    {fmtFecha(p.fecha)} · {p.kg} kg
                  </p>
                </motion.li>
              ))}
              <li className="relative">
                <span className={cn("absolute top-1 -left-[2.1rem] grid size-6 place-items-center rounded-full ring-4 ring-surface", estado.clase)}>
                  <PackageCheck className="size-3" />
                </span>
                <p className="text-sm font-semibold text-ink">Lote de exportación · {displayProduct}</p>
                <p className="text-[0.7rem] text-ink-soft">
                  {producido > 0 ? `${producido} kg de producto` : `${recibido} kg en proceso`} · {estado.label}
                </p>
              </li>
            </ol>
          </section>

          {/* QR y verificación */}
          <section className="mt-8 grid grid-cols-[auto_1fr] items-center gap-4 rounded-[1.75rem] bg-card p-4 shadow-sm">
            <div className="rounded-2xl border border-line bg-[#fffcf7] p-2">
              {url ? <QrCode value={url} label={`Código QR de la ficha del lote ${displayId}`} className="size-28" /> : <div className="size-28 animate-pulse rounded-xl bg-surface-2" />}
            </div>
            <div>
            <p className="text-sm font-semibold text-ink">Escanea o comparte</p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-ink-soft">Este código abre esta misma ficha en cualquier teléfono.</p>
              <button onClick={compartir} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.7rem] font-semibold text-ink hover:bg-surface-2">
                <Share2 className="size-3.5" /> Compartir
              </button>
            </div>
          </section>

          <button
            onClick={() => setVerificar(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-bosque px-5 py-3.5 text-sm font-semibold text-crema shadow-lg shadow-bosque/25 transition hover:bg-bosque-700"
          >
            <Fingerprint className="size-4" /> Verificar hash en blockchain
          </button>
          <button
            onClick={pedir}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            <ShoppingBag className="size-4" /> Solicitar pedido
          </button>

          <p className="mt-6 flex items-start gap-2 text-[0.68rem] leading-relaxed text-ink-soft">
            <EyeOff className="mt-0.5 size-3.5 shrink-0" />
            Esta ficha muestra solo origen, proceso y estado. Los costos internos y márgenes de la asociación no se publican.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-bosque-500 hover:underline">
            <ArrowLeft className="size-3.5" /> Conocer ORIVIA
          </Link>
        </div>
      </main>

      <EvidenceDialog open={verificar} entityId={displayId} title={`${displayProduct} · lote ${displayId}`} steps={pasos} realEvidence={realEvidence} onClose={cerrar} />
    </div>
  );
}
