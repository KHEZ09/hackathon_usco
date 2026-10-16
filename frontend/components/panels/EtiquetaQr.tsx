"use client";

import { useCallback, useState } from "react";
import { QrCode } from "lucide-react";
import { Modal } from "./Modal";
import { QrDescargable } from "@/components/ficha/QrDescargable";
import { urlFicha } from "@/lib/enlaces";

/** Botón que abre la etiqueta QR de un lote (para imprimir en el empaque). */
export function EtiquetaQr({ loteId }: { loteId: string }) {
  const [open, setOpen] = useState(false);
  const cerrar = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-bosque-500 hover:underline"
        aria-label={`Etiqueta QR del lote ${loteId}`}
      >
        QR <QrCode className="size-3" />
      </button>
      <Modal open={open} onClose={cerrar} titulo={`Etiqueta QR · ${loteId}`} subtitulo="Imprime este código en el empaque: abre la ficha pública del lote.">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <QrDescargable loteId={loteId} />
          <p className="max-w-xs font-mono text-[0.65rem] break-all text-ink-soft">{urlFicha(loteId)}</p>
        </div>
      </Modal>
    </>
  );
}
