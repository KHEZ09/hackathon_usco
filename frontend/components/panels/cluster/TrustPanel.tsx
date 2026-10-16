"use client";

import { Info, ShieldCheck } from "lucide-react";
import { calcularConfianza, type Senales } from "@/lib/cluster";
import { cn } from "@/lib/cn";

const NIVEL = { ALTA: "bg-bosque-500/15 text-bosque-500", MEDIA: "bg-ambar/15 text-ambar", BAJA: "bg-cereza/15 text-cereza" } as const;

export function TrustBadge({ senales, className }: { senales: Senales; className?: string }) {
  const c = calcularConfianza(senales);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-bold tracking-wider", NIVEL[c.nivel], className)} title={`Confianza ${c.nivel} · ${c.score}/100 (${c.formula})`}>
      <ShieldCheck className="size-3" /> {c.score}
    </span>
  );
}

/** Confianza explicable: cada punto se justifica con su dato; sin puntuación opaca (LND-05). */
export function TrustPanel({ senales }: { senales: Senales }) {
  const c = calcularConfianza(senales);
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Confianza explicable</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold tracking-wider", NIVEL[c.nivel])}>
          {c.nivel} · {c.score}/100
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {c.componentes.map((k) => (
          <li key={k.label} className="text-[0.7rem]">
            <div className="flex justify-between gap-2">
              <span className="text-ink-soft">
                {k.label} <span className="text-ink-soft/70">({k.dato})</span>
              </span>
              <span className="font-mono font-semibold">
                +{k.puntos}/{k.max}
              </span>
            </div>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-bosque-500" style={{ width: `${(k.puntos / k.max) * 100}%` }} />
            </span>
          </li>
        ))}
        <li className="flex justify-between text-[0.7rem]">
          <span className="text-ink-soft">Incidencias abiertas ({senales.incidenciasAbiertas})</span>
          <span className={cn("font-mono font-semibold", c.penalizacion ? "text-cereza" : "text-ink-soft")}>−{c.penalizacion}</span>
        </li>
      </ul>
      <div className="mt-3 space-y-1 border-t border-line pt-3">
        {c.limitaciones.map((l) => (
          <p key={l} className="flex gap-1.5 text-[0.64rem] leading-relaxed text-ink-soft">
            <Info className="mt-0.5 size-3 shrink-0" /> {l}
          </p>
        ))}
        <p className="font-mono text-[0.6rem] text-ink-soft">fórmula {c.formula}</p>
      </div>
    </div>
  );
}
