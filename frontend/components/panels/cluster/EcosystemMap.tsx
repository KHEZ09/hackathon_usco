"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ASOCIACION_ID, TIPO_ACTOR, actorExplorable, calcularConfianza, type Cluster, type TipoActor } from "@/lib/cluster";
import { cn } from "@/lib/cn";

const W = 800;
const H = 440;
const ORDEN: TipoActor[] = ["PRODUCER", "TRANSFORMER", "AGROENTREPRENEUR", "BUYER", "TRANSPORTER", "SERVICE_PROVIDER", "INSTITUTION", "ASSOCIATION"];

/**
 * Mapa relacional del ecosistema: la asociación al centro y los actores agrupados por tipo.
 * Las líneas son conexiones reales del registro (aceptadas, pendientes o rechazadas); una
 * conexión pendiente nunca se dibuja como aceptada (LND-02).
 */
export function EcosystemMap({ cluster, onSelect, soloExplorables = false }: { cluster: Cluster; onSelect: (id: string) => void; soloExplorables?: boolean }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);

  const pos = useMemo(() => {
    const otros = cluster.actores
      .filter((a) => a.id !== ASOCIACION_ID && a.visibilidad !== "PRIVATE" && (!soloExplorables || actorExplorable(a)))
      .sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo));
    const map = new Map<string, { x: number; y: number }>([[ASOCIACION_ID, { x: W / 2, y: H / 2 }]]);
    otros.forEach((a, i) => {
      const ang = -Math.PI / 2 + (i / otros.length) * Math.PI * 2;
      map.set(a.id, { x: W / 2 + Math.cos(ang) * 320, y: H / 2 + Math.sin(ang) * 168 });
    });
    return map;
  }, [cluster.actores, soloExplorables]);

  const enlaces = cluster.conexiones.filter((x) => x.estado !== "CANCELLED" && pos.has(x.solicitanteId) && pos.has(x.destinoId));
  const activo = hover ? cluster.actores.find((a) => a.id === hover) : null;

  return (
    <div className="relative">
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" role="img" aria-label="Mapa de actores del clúster cacaotero y sus conexiones">
        <defs>
          <radialGradient id="eco-halo">
            <stop offset="0" stopColor="#c98a2b" stopOpacity="0.35" />
            <stop offset="1" stopColor="#c98a2b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={W / 2} cy={H / 2} rx="320" ry="168" fill="none" stroke="var(--line)" strokeDasharray="3 7" />
        <circle cx={W / 2} cy={H / 2} r="90" fill="url(#eco-halo)" />

        {enlaces.map((x) => {
          const a = pos.get(x.solicitanteId)!;
          const b = pos.get(x.destinoId)!;
          const foco = hover && (x.solicitanteId === hover || x.destinoId === hover);
          const color = x.estado === "ACCEPTED" ? "#3f7a5e" : x.estado === "REQUESTED" ? "#c98a2b" : "#a3262a";
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 - 30;
          return (
            <g key={x.id}>
              <path
                d={`M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                fill="none"
                stroke={color}
                strokeOpacity={hover && !foco ? 0.15 : x.estado === "REJECTED" ? 0.35 : 0.9}
                strokeWidth={foco ? 3 : 2}
                strokeDasharray={x.estado === "REQUESTED" ? "6 6" : x.estado === "REJECTED" ? "2 6" : undefined}
                className={cn(x.estado === "REQUESTED" && !reduce && "[animation:dash_1.2s_linear_infinite]")}
              />
              {x.estado === "ACCEPTED" && !reduce && (
                <circle r="3" fill="#9fd3b1">
                  <animateMotion dur="2.6s" repeatCount="indefinite" path={`M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`} />
                </circle>
              )}
            </g>
          );
        })}

        {cluster.actores
          .filter((a) => pos.has(a.id))
          .map((a, i) => {
            const p = pos.get(a.id)!;
            const t = TIPO_ACTOR[a.tipo];
            const conf = calcularConfianza(a.senales).score;
            const r = a.id === ASOCIACION_ID ? 30 : 12 + conf / 12;
            const atenuado = hover && hover !== a.id && !enlaces.some((x) => (x.solicitanteId === hover && x.destinoId === a.id) || (x.destinoId === hover && x.solicitanteId === a.id));
            return (
              <motion.g
                key={a.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: atenuado ? 0.35 : 1, scale: 1 }}
                transition={{ delay: reduce ? 0 : i * 0.04, type: "spring", stiffness: 160, damping: 16 }}
                style={{ originX: `${p.x}px`, originY: `${p.y}px` }}
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${a.nombre}, ${t.label}`}
                onMouseEnter={() => setHover(a.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(a.id)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(a.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(a.id)}
              >
                <circle cx={p.x} cy={p.y} r={r + 6} fill={t.color} opacity={hover === a.id ? 0.3 : 0.12} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={a.estado === "ACTIVE" ? t.color : "transparent"}
                  stroke={t.color}
                  strokeWidth={a.estado === "ACTIVE" ? 0 : 2.5}
                  strokeDasharray={a.estado === "PENDING" ? "4 3" : undefined}
                />
                {a.estado !== "ACTIVE" && a.estado !== "PENDING" && <line x1={p.x - r * 0.7} y1={p.y - r * 0.7} x2={p.x + r * 0.7} y2={p.y + r * 0.7} stroke="#a3262a" strokeWidth="2.5" />}
                <text x={p.x} y={p.y + r + 14} textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-semibold">
                  {a.nombre.split(" · ")[0].length > 22 ? `${a.nombre.split(" · ")[0].slice(0, 21)}…` : a.nombre.split(" · ")[0]}
                </text>
                {a.id === ASOCIACION_ID && (
                  <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-[#1b3d2e] text-[10px] font-bold tracking-widest">
                    ORIVIA
                  </text>
                )}
              </motion.g>
            );
          })}
      </svg>
      </div>

      {activo && (
        <div className="pointer-events-none absolute top-2 left-2 max-w-64 rounded-xl border border-line bg-card/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur">
          <p className="font-semibold">{activo.nombre}</p>
          <p className="text-ink-soft">
            {TIPO_ACTOR[activo.tipo].label} · {activo.municipio}
          </p>
          <p className="mt-1 text-[0.65rem] text-ink-soft">Clic o Enter para abrir la ficha</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.65rem] text-ink-soft">
        {(Object.keys(TIPO_ACTOR) as TipoActor[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: TIPO_ACTOR[k].color }} /> {TIPO_ACTOR[k].plural}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-bosque-500" /> Aceptada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-ambar" /> Pendiente
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dotted border-cereza" /> Rechazada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-dashed border-ink-soft" /> En verificación
        </span>
      </div>
    </div>
  );
}
