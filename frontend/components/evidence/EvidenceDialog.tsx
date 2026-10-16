"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Check, Link2, Loader2, RotateCcw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { bloqueSimulado, hashChain, type EvidenceStep } from "@/lib/evidence";
import type { ApiBlockchainReceipt } from "@/lib/orivia-api";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";

type RealEvidence = {
  hashes: string[];
  verified: boolean;
  certificate: ApiBlockchainReceipt | null;
};
type Props = { entityId: string; title: string; steps: EvidenceStep[]; realEvidence?: RealEvidence; onClose: () => void };

// Anclas "publicadas": se calculan una vez por entidad y longitud de la cadena.
const anchors = new Map<string, string[]>();

/** Modal de verificación de la cadena de evidencia con simulación de alteración. */
export function EvidenceDialog({ open, ...props }: Props & { open: boolean }) {
  return <AnimatePresence>{open && <EvidenceDialogBody key={props.entityId} {...props} />}</AnimatePresence>;
}
function EvidenceDialogBody({ entityId, title, steps, realEvidence, onClose }: Props) {
  const { notify } = useToast();
  const [tampered, setTampered] = useState(false);
  const [chain, setChain] = useState<string[] | null>(null);
  const [anchor, setAnchor] = useState<string[] | null>(null);
  const [checked, setChecked] = useState(0);
  const anchorKey = `${entityId}:${steps.length}`;
  const tamperIndex = Math.min(1, steps.length - 1);
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
      const published = realEvidence
        ? realEvidence.hashes
        : anchors.has(anchorKey)
        ? anchors.get(anchorKey)!
        : await hashChain(entityId, steps);
      if (!realEvidence && !anchors.has(anchorKey)) anchors.set(anchorKey, published);
      const pasos = alter ? steps.map((p, n) => (n === tamperIndex ? { ...p, kg: p.kg + 5 } : p)) : steps;
      const current = realEvidence
        ? (alter ? published.map((hash, n) => (n === tamperIndex ? `${hash.slice(0, -1)}0` : hash)) : published)
        : await hashChain(entityId, pasos);
      if (id !== run.current) return; // una verificación más reciente o el cierre la invalidó
      setChecked(0);
      setAnchor(published);
      setChain(current);
      const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
      current.forEach((_, n) => later(() => setChecked(n + 1), 260 * (n + 1)));
      later(() => {
        const ok = current.at(-1) === published.at(-1) && (realEvidence ? realEvidence.verified && !alter : true);
        notify(
          ok ? "exito" : "error",
          ok ? `${entityId}: historial íntegro` : `${entityId}: alteración detectada`,
          ok
            ? realEvidence
              ? `La API confirmó la cadena y el anclaje${realEvidence.certificate?.network ? ` en ${realEvidence.certificate.network}` : ""}.`
              : "El hash recalculado coincide con el ancla publicada."
            : `El evento "${steps[tamperIndex]?.etapa ?? "seleccionado"}" no coincide con la evidencia anclada.`,
        );
      }, 260 * (current.length + 1));
    },
    [entityId, steps, realEvidence, anchorKey, tamperIndex, notify],
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
  const ok = done && anchor && chain.at(-1) === anchor.at(-1) && (realEvidence ? realEvidence.verified && !tampered : true);
  const bloque = realEvidence?.certificate?.block_number ?? (anchor ? bloqueSimulado(anchor.at(-1)!) : 0);

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
                  {title}
                </h2>
              </div>
              <button onClick={onClose} aria-label="Cerrar verificación" className="rounded-full p-2 text-ink-soft hover:bg-surface-2 hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <ol className="mt-6 space-y-2">
              {steps.map((p, n) => {
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
                        {tampered && n === tamperIndex && <span className="ml-2 text-cereza">kg alterado</span>}
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
                    {realEvidence?.certificate && (
                      <div className="col-span-2">
                        <p className="text-crema/60">Certificado</p>
                        <p className="font-mono break-all">{String(realEvidence.certificate.transaction_id ?? realEvidence.certificate.reference ?? "anclaje confirmado")}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.68rem] leading-relaxed text-ink-soft">
                {realEvidence
                  ? "Hashes y estado de integridad leídos desde la API. El certificado corresponde al anclaje persistido del backend."
                  : "Hashes calculados en tu navegador como respaldo local. Esta ficha aún no recibió evidencia persistida del backend."}
              </p>
              <button
                onClick={toggleTamper}
                disabled={!done}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-cereza/50 disabled:opacity-50"
              >
                {tampered ? <RotateCcw className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                {tampered ? "Restaurar dato original" : realEvidence ? "Simular alteración visual" : "Simular alteración"}
              </button>
            </div>
          </motion.div>
        </motion.div>
  );
}
