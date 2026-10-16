"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { QrCode, Search } from "lucide-react";
import { FichaPublica } from "./FichaPublica";

const sinSuscripcion = () => () => {};
const leerLote = () => (new URLSearchParams(window.location.search).get("lote") ?? "").trim().toUpperCase();

/**
 * Lee el lote de la URL (?lote=) para que la ficha funcione en el sitio estático con lotes nuevos.
 * Se lee en el navegador (no con useSearchParams) para no depender de un límite de Suspense.
 */
export function FichaPorConsulta() {
  const lote = useSyncExternalStore(sinSuscripcion, leerLote, () => null);
  if (lote === null) return <div className="min-h-svh bg-bosque-950" />;
  if (/^[A-Z0-9-]{2,80}$/.test(lote)) return <FichaPublica loteId={lote} />;
  return (
    <div className="grid min-h-svh place-items-center bg-bosque-950 px-6 text-center text-crema">
      <div className="max-w-sm">
        <QrCode className="mx-auto size-10 text-[#e2b86e]" />
        <h1 className="mt-5 text-2xl font-semibold">Consulta un lote</h1>
        <p className="mt-3 text-sm text-crema/70">Escanea el código QR del empaque o escribe el código del lote.</p>
        <form action="/ficha/" className="mt-6 flex gap-2">
          <input name="lote" required placeholder="CAC001" aria-label="Código del lote" className="min-w-0 flex-1 rounded-full bg-crema/10 px-4 py-2.5 text-sm uppercase outline-none placeholder:text-crema/40 focus:ring-2 focus:ring-[#e2b86e]" />
          <button className="inline-flex items-center gap-1.5 rounded-full bg-[#e2b86e] px-4 py-2.5 text-sm font-semibold text-bosque">
            <Search className="size-4" /> Ver
          </button>
        </form>
        <Link href="/" className="mt-6 inline-block text-xs text-crema/60 underline">Volver al inicio</Link>
      </div>
    </div>
  );
}
