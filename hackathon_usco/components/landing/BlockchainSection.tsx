"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Check, Fingerprint, Link2, Loader2, MapPin, RotateCcw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";
import { LOTES, type DemoLot, type TraceStep } from "@/lib/demo-data";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";

const PRODUCTOS = [
  { lot: "CAC002", nombre: "Cacao seco premium", img: "/media/cafetal.jpg", notas: "Notas a frutos rojos y panela" },
  { lot: "CAC003", nombre: "Cacao fino de aroma", img: "/media/paisaje-montanas.jpg", notas: "Floral, acidez brillante" },
  { lot: "CAC001", nombre: "Cacao de montaña", img: "/media/rama-frutos.jpg", notas: "Cuerpo alto, final a nuez" },
] as const;

const GENESIS = "0".repeat(64);

/** JSON canónico: claves ordenadas para que el hash no dependa del orden. */
function canonical(value: Record<string, string | number>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashChain(lot: DemoLot, pasos: TraceStep[]) {
  const out: string[] = [];
  let prev = GENESIS;
  for (const p of pasos) {
    prev = await sha256(canonical({ lote: lot.id, etapa: p.etapa, fecha: p.fecha, kg: p.kg, responsable: p.responsable }) + prev);
    out.push(prev);
  }
  return out;
}

// Anclas "publicadas": se calculan una vez con el registro original.
const anchors = new Map<string, string[]>();

export function BlockchainSection() {
  const [openLot, setOpenLot] = useState<DemoLot | null>(null);

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

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PRODUCTOS.map((p, i) => {
            const lot = LOTES.find((l) => l.id === p.lot)!;
            return (
              <Reveal key={p.lot} delay={i * 0.08}>
                <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[16/10] overflow-hidden">
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
                    <button
                      onClick={() => setOpenLot(lot)}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-bosque px-4 py-2.5 text-xs font-semibold text-crema transition hover:bg-bosque-700"
                    >
                      <Fingerprint className="size-4" /> Verificar hash
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>

      <VerifyModal lot={openLot} onClose={() => setOpenLot(null)} />
    </section>
  );
}

function VerifyModal({ lot, onClose }: { lot: DemoLot | null; onClose: () => void }) {
  return <AnimatePresence>{lot && <VerifyDialog key={lot.id} lot={lot} onClose={onClose} />}</AnimatePresence>;
}

function VerifyDialog({ lot, onClose }: { lot: DemoLot; onClose: () => void }) {
  const { notify } = useToast();
  const [tampered, setTampered] = useState(false);
  const [chain, setChain] = useState<string[] | null>(null);
  const [anchor, setAnchor] = useState<string[] | null>(null);
  const [checked, setChecked] = useState(0);
  const run = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cancel = () => {
    run.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const verify = useCallback(
    async (alter: boolean) => {
      const id = ++run.current;
      if (!anchors.has(lot.id)) anchors.set(lot.id, await hashChain(lot, lot.pasos));
      const pasos = alter ? lot.pasos.map((p) => (p.key === "secado" ? { ...p, kg: p.kg + 5 } : p)) : lot.pasos;
      const current = await hashChain(lot, pasos);
      if (id !== run.current) return; // una verificación más reciente o el cierre la invalidó
      setChecked(0);
      setAnchor(anchors.get(lot.id)!);
      setChain(current);
      const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
      current.forEach((_, n) => later(() => setChecked(n + 1), 260 * (n + 1)));
      later(() => {
        const ok = current.at(-1) === anchors.get(lot.id)!.at(-1);
        notify(
          ok ? "exito" : "error",
          ok ? `Lote ${lot.id}: historial íntegro` : `Lote ${lot.id}: alteración detectada`,
          ok ? "El hash recalculado coincide con el ancla publicada." : "El evento de secado no coincide con la evidencia anclada.",
        );
      }, 260 * (current.length + 1));
    },
    [lot, notify],
  );

  useEffect(() => {
    verify(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancel();
      window.removeEventListener("keydown", onKey);
    };
  }, [verify, onClose]);

  const toggleTamper = () => {
    const next = !tampered;
    cancel();
    setTampered(next);
    setChain(null);
    verify(next);
  };

  const done = chain && checked >= chain.length;
  const ok = done && anchor && chain.at(-1) === anchor.at(-1);
  const bloque = anchor ? 1_840_000 + (parseInt(anchor.at(-1)!.slice(0, 4), 16) % 1000) : 0;

  return (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-bosque-950/70 backdrop-blur-md" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-card p-6 shadow-2xl sm:rounded-[2rem] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-tierra uppercase dark:text-tierra-300">
                  Verificación de integridad
                </p>
                <h2 id="verify-title" className="mt-2 text-xl font-semibold text-ink">
                  Lote <span className="font-mono">{lot.id}</span> · {lot.finca}
                </h2>
              </div>
              <button onClick={onClose} aria-label="Cerrar verificación" className="rounded-full p-2 text-ink-soft hover:bg-surface-2 hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <ol className="mt-6 space-y-2">
              {lot.pasos.map((p, n) => {
                const h = chain?.[n];
                const isChecked = checked > n;
                const match = h && anchor ? h === anchor[n] : true;
                return (
                  <li
                    key={p.key}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                      isChecked && !match ? "border-cereza/40 bg-cereza/8" : "border-line bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full",
                        !isChecked && "bg-surface-2 text-ink-soft",
                        isChecked && match && "bg-bosque-500 text-crema",
                        isChecked && !match && "bg-cereza text-crema",
                      )}
                    >
                      {!isChecked ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : match ? (
                        <Check className="size-3.5" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">
                        {p.etapa}
                        {tampered && p.key === "secado" && <span className="ml-2 text-cereza">kg alterado</span>}
                      </p>
                      <p className="truncate font-mono text-[0.65rem] text-ink-soft">{h ?? "calculando…"}</p>
                    </div>
                    {n > 0 && <Link2 className="size-3.5 shrink-0 text-ink-soft" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>

            <AnimatePresence mode="wait">
              {done && (
                <motion.div
                  key={ok ? "ok" : "bad"}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn("mt-5 rounded-2xl p-5", ok ? "bg-bosque text-crema" : "bg-cereza text-crema")}
                >
                  <div className="flex items-center gap-3">
                    {ok ? <ShieldCheck className="size-6" /> : <ShieldAlert className="size-6" />}
                    <p className="text-sm font-semibold">{ok ? "Hash SHA-256 confirmado" : "La cadena no coincide con el ancla"}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[0.7rem]">
                    <div>
                      <p className="text-crema/60">Bloque</p>
                      <p className="flex items-center gap-1.5 font-mono font-semibold">
                        <Boxes className="size-3.5" /> #{bloque.toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div>
                      <p className="text-crema/60">Estado</p>
                      <p className="font-mono font-semibold">{ok ? "INMUTABLE" : "ALTERADO"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-crema/60">Ancla publicada</p>
                      <p className="font-mono break-all">{anchor?.at(-1)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.68rem] leading-relaxed text-ink-soft">
                Hashes reales calculados en tu navegador. Anclaje en modo local simulado: la publicación en testnet llega con el
                backend.
              </p>
              <button
                onClick={toggleTamper}
                disabled={!done}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-cereza/50 disabled:opacity-50"
              >
                {tampered ? <RotateCcw className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                {tampered ? "Restaurar dato original" : "Simular alteración"}
              </button>
            </div>
          </motion.div>
        </motion.div>
  );
}
