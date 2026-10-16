"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { QrCode } from "./QrCode";
import { urlFicha } from "@/lib/enlaces";
import { cn } from "@/lib/cn";

/** QR de la ficha pública de un lote, con descarga en SVG para imprimir la etiqueta del empaque. */
export function QrDescargable({ loteId, className, compacto }: { loteId: string; className?: string; compacto?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const url = urlFicha(loteId);

  const descargar = () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const copia = svg.cloneNode(true) as SVGSVGElement;
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copia.setAttribute("width", "600");
    copia.setAttribute("height", "600");
    const blob = new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `orivia-qr-${loteId}.svg`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div ref={ref} className="rounded-xl bg-[#fffcf7] p-1.5 shadow-inner">
        <QrCode value={url} label={`Código QR de la ficha del lote ${loteId}`} className={compacto ? "size-20" : "size-28"} />
      </div>
      <button
        type="button"
        onClick={descargar}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-semibold text-bosque-500 transition hover:bg-bosque-500/10"
        aria-label={`Descargar el código QR del lote ${loteId}`}
      >
        <Download className="size-3" /> Descargar QR
      </button>
    </div>
  );
}
