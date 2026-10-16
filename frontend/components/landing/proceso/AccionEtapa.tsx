"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, ClipboardList, Fingerprint, LogIn } from "lucide-react";
import type { ProcessStage } from "@/data/cacaoProcessData";
import { Modal } from "@/components/panels/Modal";
import { EvidenceDialog } from "@/components/evidence/EvidenceDialog";
import { MERMA_UMBRAL, alertas, historia, inventario, merma, useDatos } from "@/lib/store";

const boton =
  "inline-flex items-center gap-1.5 rounded-full border border-crema/40 px-4 py-2 text-xs font-semibold text-crema transition hover:bg-crema hover:text-bosque";

/** Botón de acción de una etapa según `actionButton.actionType` del archivo de datos. */
export function AccionEtapa({ stage }: { stage: ProcessStage }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  const { label, url, actionType } = stage.actionButton;

  if (actionType === "navigate" && url) {
    return (
      <Link href={url} className={boton}>
        {label} <ArrowUpRight className="size-3.5" />
      </Link>
    );
  }
  if (actionType === "scroll") {
    return (
      <button onClick={() => url && document.querySelector(url)?.scrollIntoView({ behavior: "smooth" })} className={boton}>
        {label} <ArrowUpRight className="size-3.5" />
      </button>
    );
  }
  return (
    <>
      <button onClick={() => setAbierto(true)} className={boton} aria-haspopup="dialog">
        {label} <ArrowUpRight className="size-3.5" />
      </button>
      {stage.id === "empaque" ? <VerificarModal open={abierto} onClose={cerrar} /> : <InfoModal stage={stage} open={abierto} onClose={cerrar} />}
    </>
  );
}

/** Verifica la cadena SHA-256 del lote CAC001 con el mismo diálogo de la ficha pública. */
function VerificarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const datos = useDatos();
  const lote = datos.lotes.find((l) => l.id === "CAC001");
  return (
    <EvidenceDialog
      open={open}
      entityId="CAC001"
      title={`${lote?.producto ?? "Cacao"} · lote CAC001`}
      steps={historia(datos, "CAC001")}
      onClose={onClose}
    />
  );
}

function InfoModal({ stage, open, onClose }: { stage: ProcessStage; open: boolean; onClose: () => void }) {
  const datos = useDatos();
  return (
    <div data-tema="claro">
      <Modal open={open} onClose={onClose} titulo={stage.actionButton.label} subtitulo={`${stage.label} · datos de demostración`}>
        {stage.id === "fermentacion" && (
          <div className="space-y-4 text-sm">
            <p className="leading-relaxed text-ink-soft">
              El operador registra cada etapa con lote de origen, entrada, salida, responsable e incidencias. ORIVIA valida que no se
              consuma más de lo disponible y evita registrar dos veces la misma operación.
            </p>
            <ul className="space-y-2">
              {datos.transformaciones.slice(-3).reverse().map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
                  <ClipboardList className="size-4 shrink-0 text-bosque-500" />
                  <span className="flex-1">
                    <span className="font-mono font-semibold">{t.loteId}</span> · {t.etapa} · {t.entradaKg} → {t.salidaKg} kg
                  </span>
                  <span className={merma(t) > MERMA_UMBRAL ? "font-semibold text-ambar" : "text-ink-soft"}>{merma(t)}%</span>
                </li>
              ))}
            </ul>
            <Link href="/operador" className="inline-flex items-center gap-2 rounded-full bg-bosque px-5 py-2.5 text-xs font-semibold text-crema hover:bg-bosque-700">
              <LogIn className="size-3.5" /> Ir al panel del operador
            </Link>
          </div>
        )}
        {stage.id === "secado" && (
          <div className="space-y-3 text-sm">
            <p className="leading-relaxed text-ink-soft">Alertas calculadas con los datos actuales y el umbral de merma del {MERMA_UMBRAL}%.</p>
            {alertas(datos).map((a) => {
              const inv = inventario(datos, a.loteId);
              return (
                <div key={a.id} className="flex gap-3 rounded-xl border border-ambar/40 bg-ambar/10 px-3 py-2.5 text-xs">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" />
                  <span>
                    {a.texto}
                    <span className="block text-ink-soft">
                      Recibido {inv.recibido} kg · producido {inv.producido} kg
                    </span>
                  </span>
                </div>
              );
            })}
            {alertas(datos).length === 0 && <p className="text-xs text-ink-soft">No hay alertas activas.</p>}
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-bosque px-5 py-2.5 text-xs font-semibold text-crema hover:bg-bosque-700">
              <Fingerprint className="size-3.5" /> Revisar en el panel del administrador
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
