"use client";

import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import type { EstadoSincronizacion } from "@/lib/backend-sync";
import { cn } from "@/lib/cn";

const TEXTOS: Record<EstadoSincronizacion, { label: string; hint: string }> = {
  servidor: { label: "Datos del servidor", hint: "Lotes, estados, costos y auditoría leídos desde PostgreSQL." },
  cargando: { label: "Sincronizando…", hint: "Consultando los lotes en el servidor." },
  error: { label: "Sin conexión con el servidor", hint: "Se muestran los últimos datos guardados en este equipo." },
  local: { label: "Datos locales de demostración", hint: "Inicia sesión con una cuenta real para trabajar sobre la base de datos." },
};

/** Indica de dónde vienen los datos del panel y permite volver a consultarlos. */
export function SyncBadge({ estado, onRecargar }: { estado: EstadoSincronizacion; onRecargar: () => void }) {
  const t = TEXTOS[estado];
  const Icono = estado === "cargando" ? Loader2 : estado === "servidor" ? Cloud : CloudOff;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs",
        estado === "servidor" && "border-bosque-500/30 bg-bosque-500/8 text-ink",
        estado === "error" && "border-cereza/30 bg-cereza/8 text-ink",
        (estado === "local" || estado === "cargando") && "border-line bg-surface-2 text-ink-soft",
      )}
    >
      <Icono className={cn("size-4 shrink-0", estado === "cargando" && "animate-spin", estado === "servidor" && "text-bosque-500")} />
      <span className="font-semibold">{t.label}</span>
      <span className="text-ink-soft">· {t.hint}</span>
      {estado !== "local" && (
        <button
          type="button"
          onClick={onRecargar}
          disabled={estado === "cargando"}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition hover:bg-card disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" /> Actualizar
        </button>
      )}
    </div>
  );
}
