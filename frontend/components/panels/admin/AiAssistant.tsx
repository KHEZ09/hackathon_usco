"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Bot, Loader2, Send, Sparkles } from "lucide-react";
import { cop } from "@/lib/demo-data";
import { MERMA_UMBRAL, economia, inventario, merma, type Datos } from "@/lib/store";
import { cn } from "@/lib/cn";
import { getAiAnalytics } from "@/lib/orivia-api";

type Analisis = {
  resumen: string;
  severidad: "alta" | "media" | "baja";
  hechos: string[];
  recomendacion: string;
  incertidumbres: string[];
};

/** Auditoría determinística del lote: hechos calculados, nunca inventados (fallback sin Ollama). */
function analizar(d: Datos, loteId: string): Analisis | null {
  const lote = d.lotes.find((l) => l.id === loteId);
  if (!lote) return null;
  const inv = inventario(d, loteId);
  const eco = economia(d, lote);
  const trs = d.transformaciones.filter((t) => t.loteId === loteId);
  const peor = trs.reduce<(typeof trs)[number] | null>((m, t) => (!m || merma(t) > merma(m) ? t : m), null);
  const mPeor = peor ? merma(peor) : 0;
  const alta = mPeor > MERMA_UMBRAL || lote.estado === "BLOQUEADO";

  const hechos = [
    `Recibido: ${inv.recibido} kg (${lote.origen})`,
    `Consumido: ${inv.consumido} kg · disponible ${inv.disponible} kg`,
    peor ? `Mayor merma: ${mPeor}% en ${peor.etapa.toLowerCase()} (${peor.entradaKg} → ${peor.salidaKg} kg)` : "Sin transformaciones registradas",
    `Umbral de merma: ${MERMA_UMBRAL}%`,
    `Costo unitario: ${cop.format(eco.costoUnitario)}/kg · margen ${eco.margen}%`,
    `Estado actual: ${lote.estado}`,
  ];

  let resumen = `${loteId} opera dentro de los parámetros esperados.`;
  let recomendacion = lote.estado === "PENDIENTE" ? "Puede evaluarse su liberación tras la verificación de calidad." : "Mantener el seguimiento rutinario.";
  if (mPeor > MERMA_UMBRAL) {
    resumen = `${loteId} presenta una merma del ${mPeor}%, superior al umbral permitido del ${MERMA_UMBRAL}%.`;
    recomendacion =
      lote.estado === "BLOQUEADO"
        ? "Mantener el lote bloqueado, revisar la etapa con mayor pérdida y documentar la causa antes de cualquier liberación."
        : "Revisar la transformación, confirmar el pesaje y considerar el bloqueo preventivo hasta aclarar la causa.";
  } else if (lote.estado === "BLOQUEADO") {
    resumen = `${loteId} está bloqueado por decisión administrativa; no puede aparecer como disponible.`;
    recomendacion = "Resolver el motivo del bloqueo y registrar la decisión en auditoría.";
  } else if (eco.margen < 10) {
    resumen = `${loteId} tiene un margen estimado bajo (${eco.margen}%).`;
    recomendacion = "Revisar los supuestos de costo y precio antes de comprometer pedidos.";
  }

  const incertidumbres = [
    trs.some((t) => t.incidencias) ? `Incidencia reportada: "${trs.find((t) => t.incidencias)!.incidencias}"` : "No hay incidencias reportadas por el operador.",
    "No se ha confirmado si el costo total incluye empaque y transporte.",
  ];
  return { resumen, severidad: alta ? "alta" : eco.margen < 10 ? "media" : "baja", hechos, recomendacion, incertidumbres };
}

const PREGUNTAS = ["¿Por qué hay alerta?", "¿Qué pasa si lo bloqueo?", "¿Cómo se calcula el margen?"];

function responder(d: Datos, loteId: string, pregunta: string) {
  const a = analizar(d, loteId);
  const lote = d.lotes.find((l) => l.id === loteId);
  if (!a || !lote) return "No encuentro ese lote.";
  const q = pregunta.toLowerCase();
  if (q.includes("bloq"))
    return `Al bloquear ${loteId} su estado pasa a BLOQUEADO, la ficha pública muestra "No disponible", no admite nuevas transformaciones ni pedidos y se registra quién, cuándo, el valor anterior (${lote.estado}) y el motivo. El historial no se borra.`;
  if (q.includes("margen") || q.includes("costo")) {
    const eco = economia(d, lote);
    return `Costo unitario = costo total / kg producidos = ${cop.format(lote.costoTotalCop)} / ${eco.kgBase} kg = ${cop.format(eco.costoUnitario)}/kg. Margen = (precio − costo) / precio = (${cop.format(lote.precioVentaKgCop)} − ${cop.format(eco.costoUnitario)}) / ${cop.format(lote.precioVentaKgCop)} = ${eco.margen}%.`;
  }
  if (q.includes("alerta") || q.includes("merma")) return `${a.resumen} ${a.recomendacion}`;
  return `${a.resumen} Hechos clave: ${a.hechos.slice(0, 3).join("; ")}.`;
}

export function AiAssistant({ datos, loteId }: { datos: Datos; loteId: string }) {
  const [estado, setEstado] = useState<"listo" | "pensando">("listo");
  const [visible, setVisible] = useState(0);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [remote, setRemote] = useState<{ text: string; source: string } | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const analisis = analizar(datos, loteId);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const generar = async () => {
    timers.current.forEach(clearTimeout);
    setEstado("pensando");
    setVisible(0);
    setRemoteError(null);
    try {
      const response = await getAiAnalytics({ focus_lot: loteId });
      const insight = response.insight;
      const text = insight && typeof insight === "object" && typeof (insight as { text?: unknown }).text === "string"
        ? (insight as { text: string }).text
        : "";
      const source = insight && typeof insight === "object" && typeof (insight as { source?: unknown }).source === "string"
        ? (insight as { source: string }).source
        : "api";
      if (!text) throw new Error("La API de IA devolvió un análisis vacío.");
      setRemote({ text, source });
    } catch (error) {
      setRemote(null);
      setRemoteError(error instanceof Error ? error.message : "La API de IA no respondió; se usará el respaldo local.");
    } finally {
      setEstado("listo");
      setVisible(1);
      timers.current = [
        ...[2, 3, 4].map((n) => setTimeout(() => setVisible(n), n * 320)),
      ];
    }
  };

  const preguntar = (q: string) => {
    if (!q.trim()) return;
    setChat((c) => [...c.slice(-3), { q, a: responder(datos, loteId, q) }]);
    setPregunta("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-bosque-500/15 text-bosque-300">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Ollama · explicación</h2>
            <p className="text-[0.68rem] text-ink-soft">
              Lote <span className="font-mono text-ink">{loteId}</span> · selecciónalo en el grafo
            </p>
          </div>
        </div>
        <button
          onClick={generar}
          disabled={estado === "pensando"}
          className="inline-flex items-center gap-1.5 rounded-full bg-crema px-3.5 py-2 text-xs font-semibold text-bosque transition hover:bg-white disabled:opacity-60"
        >
          {estado === "pensando" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Analizar
        </button>
      </div>

      <div className="mt-4 min-h-[220px] flex-1 rounded-2xl bg-surface-2 p-4 text-sm">
          {estado === "pensando" ? (
          <p className="flex items-center gap-2 text-ink-soft">
            <Loader2 className="size-4 animate-spin" /> Consultando la auditoría operativa en la API…
          </p>
        ) : !analisis ? null : visible === 0 ? (
          <p className="leading-relaxed text-ink-soft">
            Pulsa <span className="font-semibold text-ink">Analizar</span> para obtener hechos, severidad y recomendación del lote seleccionado.
          </p>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold leading-snug">{remote?.text ?? analisis.resumen}</p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold tracking-wider",
                  analisis.severidad === "alta" && "bg-cereza text-crema",
                  analisis.severidad === "media" && "bg-ambar text-carbon",
                  analisis.severidad === "baja" && "bg-bosque-500 text-crema",
                )}
              >
                SEVERIDAD {analisis.severidad.toUpperCase()}
              </span>
            </div>
            <AnimatePresence>
              {visible >= 2 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">Hechos medidos</p>
                  <ul className="mt-1.5 space-y-1">
                    {analisis.hechos.map((h) => (
                      <li key={h} className="flex gap-2 text-xs">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-bosque-300" /> {h}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {visible >= 3 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">Recomendación (interpretación)</p>
                  <p className="mt-1 text-xs leading-relaxed">{analisis.recomendacion}</p>
                </motion.div>
              )}
              {visible >= 4 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">Incertidumbres</p>
                  {analisis.incertidumbres.map((u) => (
                    <p key={u} className="mt-1 text-xs leading-relaxed text-ink-soft">
                      {u}
                    </p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {remote && <p className="mt-3 font-mono text-[0.62rem] text-bosque-500">Fuente confirmada: {remote.source}</p>}
            {remoteError && <p className="mt-3 text-[0.68rem] text-ambar">IA remota no disponible: {remoteError} Se muestran hechos locales verificables.</p>}
          </div>
        )}
      </div>

      {chat.length > 0 && (
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {chat.map((m, i) => (
            <div key={i} className="space-y-1.5 text-xs">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-bosque px-3 py-2 text-crema">{m.q}</p>
              <p className="flex max-w-[92%] gap-2 rounded-2xl rounded-bl-sm bg-surface-2 px-3 py-2 leading-relaxed">
                <Bot className="mt-0.5 size-3.5 shrink-0 text-bosque-300" /> {m.a}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PREGUNTAS.map((q) => (
        <button key={q} onClick={() => preguntar(q)} className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] text-ink-soft transition hover:border-bosque-300 hover:text-ink">
            {q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(pregunta);
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Pregunta sobre este lote…"
          aria-label="Pregunta para el asistente"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-xs text-ink outline-none focus:border-bosque-500"
        />
        <button type="submit" aria-label="Enviar pregunta" className="grid size-9 place-items-center rounded-full bg-bosque text-crema transition hover:bg-bosque-700">
          <Send className="size-3.5" />
        </button>
      </form>

      <p className="mt-3 flex items-center gap-1.5 text-[0.65rem] text-ink-soft">
        <BadgeCheck className="size-3.5 text-bosque-300" /> {remote ? `Resumen generado por ${remote.source}; hechos y cálculos se contrastan con el backend.` : "Hechos calculados por el sistema. Pulsa Analizar para intentar usar la IA remota; si no hay sesión, queda el fallback local."}
      </p>
    </div>
  );
}
