"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Handshake, Lock, Mail, Phone, Send, StickyNote } from "lucide-react";
import { Modal } from "../Modal";
import { Button, Field, Textarea } from "../ui";
import { TrustPanel } from "./TrustPanel";
import { useSession } from "@/components/auth/roles";
import { useToast } from "@/components/ui/Toaster";
import { useDatos } from "@/lib/store";
import { rutaFicha } from "@/lib/enlaces";
import {
  ASOCIACION_ID,
  CATEGORIA_NECESIDAD,
  CATEGORIA_OFERTA,
  ESTADO_ACTOR,
  ESTADO_CONEXION,
  ESTADO_NECESIDAD,
  TIPO_ACTOR,
  actorPorId,
  contactoVisible,
  solicitarConexion,
  todasLasOfertas,
  useCluster,
} from "@/lib/cluster";
import { cn } from "@/lib/cn";

export type Rol = "operador" | "administrador";

/** Ficha interna de un actor: público siempre, compartido tras conexión aceptada, privado solo para administración. */
export function ActorSheet({ actorId, rol, onClose }: { actorId: string | null; rol: Rol; onClose: () => void }) {
  const cluster = useCluster();
  const datos = useDatos();
  const [conectar, setConectar] = useState(false);
  const actor = actorId ? actorPorId(cluster, actorId) : undefined;

  if (!actor) return null;
  const tipo = TIPO_ACTOR[actor.tipo];
  const necesidades = cluster.necesidades.filter((n) => n.actorId === actor.id);
  const ofertas = todasLasOfertas(cluster, datos).filter((o) => o.actorId === actor.id);
  const conexiones = cluster.conexiones.filter(
    (x) => (x.solicitanteId === actor.id && x.destinoId === ASOCIACION_ID) || (x.destinoId === actor.id && x.solicitanteId === ASOCIACION_ID),
  );
  const verContacto = contactoVisible(cluster, actor.id, rol);

  return (
    <>
      <Modal open={!!actorId && !conectar} onClose={onClose} titulo={actor.nombre} subtitulo={`${tipo.label} · ${actor.municipio}, Huila · Dato sintético de demostración`} ancho="lg">
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full px-2.5 py-1 text-[0.62rem] font-semibold" style={{ background: `${tipo.color}33`, color: "var(--ink)" }}>
                {tipo.label}
              </span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.62rem] font-semibold">{ESTADO_ACTOR[actor.estado]}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.62rem] font-semibold">Perfil {({ PUBLIC: "público", SHARED: "compartido", PRIVATE: "privado" } as const)[actor.visibilidad]}</span>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{actor.descripcion}</p>
            <div>
              <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">Capacidades</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {actor.capacidades.map((c) => (
                  <span key={c} className="rounded-lg border border-line px-2 py-1 text-[0.7rem]">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {actor.lotes && (
              <div>
                <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">Lotes trazados</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {actor.lotes.map((l) => {
                    const lote = datos.lotes.find((x) => x.id === l);
                    return (
                      <Link key={l} href={rutaFicha(l)} className="rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-[0.7rem] font-semibold hover:underline">
                        {l} · {lote?.estado ?? "—"}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Lista titulo="Necesidades" vacio="Sin necesidades publicadas.">
                {necesidades.map((n) => (
                  <li key={n.id} className="rounded-xl bg-surface-2 px-3 py-2 text-[0.72rem]">
                    <span className="font-semibold">{n.titulo}</span>
                    <span className="block text-ink-soft">
                      {CATEGORIA_NECESIDAD[n.categoria]} · {n.cantidad} {n.unidad} · {ESTADO_NECESIDAD[n.estado]}
                    </span>
                  </li>
                ))}
              </Lista>
              <Lista titulo="Ofertas" vacio="Sin ofertas publicadas.">
                {ofertas.map((o) => (
                  <li key={o.id} className="rounded-xl bg-surface-2 px-3 py-2 text-[0.72rem]">
                    <span className="font-semibold">{o.titulo}</span>
                    <span className="block text-ink-soft">
                      {CATEGORIA_OFERTA[o.categoria]} · {o.cantidad} {o.unidad}
                    </span>
                  </li>
                ))}
              </Lista>
            </div>

            {/* Datos compartidos: solo tras conexión aceptada (LND-08) */}
            <div className="rounded-2xl border border-line p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                {verContacto ? <Handshake className="size-4 text-bosque-500" /> : <Lock className="size-4 text-ink-soft" />} Contacto
                <span className="ml-auto text-[0.6rem] font-normal text-ink-soft">Nivel compartido</span>
              </p>
              {verContacto ? (
                <div className="mt-2 space-y-1 text-[0.75rem]">
                  <p className="flex items-center gap-2">
                    <Mail className="size-3.5 text-ink-soft" /> {actor.contacto.email}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 text-ink-soft" /> {actor.contacto.telefono}
                  </p>
                  {rol === "administrador" && actor.id !== ASOCIACION_ID && !conexiones.some((x) => x.estado === "ACCEPTED") && (
                    <p className="text-[0.65rem] text-ambar">Visible por tu rol de administración; el operador no lo ve sin una conexión aceptada.</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-soft">
                  Se comparte cuando la contraparte acepta una solicitud de conexión. Pulsar un botón no revela datos ni crea una relación.
                </p>
              )}
            </div>

            {rol === "administrador" && (
              <div className="rounded-2xl border border-dashed border-cereza/40 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <StickyNote className="size-4 text-[#f08a8c]" /> Notas internas <span className="ml-auto text-[0.6rem] font-normal text-ink-soft">Privado · solo administración</span>
                </p>
                <p className="mt-2 text-[0.75rem] text-ink-soft">{actor.notasInternas}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <TrustPanel senales={actor.senales} />
            {conexiones.length > 0 && (
              <Lista titulo="Relación con la asociación" vacio="">
                {conexiones.map((x) => (
                  <li key={x.id} className="rounded-xl bg-surface-2 px-3 py-2 text-[0.72rem]">
                    <span className="font-semibold">{x.solicitanteId === ASOCIACION_ID ? "Enviada" : "Recibida"}</span> · {ESTADO_CONEXION[x.estado]}
                    <span className="block text-ink-soft">“{x.mensaje}”</span>
                  </li>
                ))}
              </Lista>
            )}
            {actor.id !== ASOCIACION_ID &&
              (rol === "administrador" ? (
                <Button className="w-full py-3" onClick={() => setConectar(true)}>
                  <Send className="size-3.5" /> Solicitar conexión
                </Button>
              ) : (
                <p className="flex gap-2 rounded-xl bg-surface-2 p-3 text-[0.7rem] leading-relaxed text-ink-soft">
                  <EyeOff className="mt-0.5 size-3.5 shrink-0" /> Las solicitudes de conexión las envía el administrador en nombre de la asociación.
                </p>
              ))}
          </div>
        </div>
      </Modal>
      <ConnectDialog open={conectar} destinoId={actor.id} onClose={() => setConectar(false)} />
    </>
  );
}

function Lista({ titulo, vacio, children }: { titulo: string; vacio: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div>
      <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">{titulo}</p>
      {items.filter(Boolean).length === 0 && vacio ? <p className="mt-2 text-[0.7rem] text-ink-soft">{vacio}</p> : <ul className="mt-2 space-y-1.5">{children}</ul>}
    </div>
  );
}

/** Solicitud de conexión: crea un registro pendiente; nunca una relación aceptada. */
export function ConnectDialog({
  open,
  destinoId,
  necesidadId,
  ofertaId,
  sugerencia,
  onClose,
}: {
  open: boolean;
  destinoId: string;
  necesidadId?: string;
  ofertaId?: string;
  sugerencia?: string;
  onClose: () => void;
}) {
  const cluster = useCluster();
  const session = useSession();
  const { notify } = useToast();
  const destino = actorPorId(cluster, destinoId);
  const [mensaje, setMensaje] = useState(sugerencia ?? "");
  const [error, setError] = useState<string | null>(null);

  const enviar = () => {
    const r = solicitarConexion({ destinoId, necesidadId, ofertaId, mensaje }, { email: session?.email ?? "admin@orivia.co", role: session?.role ?? "" });
    if (!r.ok) {
      setError(r.error);
      notify("error", "Solicitud no enviada", r.error);
      return;
    }
    notify("exito", "Solicitud pendiente", r.mensaje);
    setMensaje("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} titulo={`Solicitar conexión con ${destino?.nombre ?? ""}`} subtitulo="En nombre de la Asociación Cacao Huila">
      <ol className="mb-4 grid grid-cols-5 gap-1 text-center text-[0.58rem] text-ink-soft">
        {["Descubrir", "Revisar ficha", "Solicitar", "Aceptación humana", "Compartir datos"].map((p, i) => (
          <li key={p} className={cn("rounded-lg px-1 py-1.5", i === 2 ? "bg-bosque text-crema" : "bg-surface-2")}>
            {p}
          </li>
        ))}
      </ol>
      <Field label="Mensaje para la contraparte" error={error ?? undefined}>
        <Textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Explica el motivo: volumen, fechas, servicio requerido…" />
      </Field>
      <p className="mt-3 text-[0.68rem] leading-relaxed text-ink-soft">
        La solicitud queda <strong>pendiente</strong>. El contacto y las condiciones solo se comparten si {destino?.nombre ?? "la contraparte"} la acepta.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="fantasma" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={enviar}>
          <Send className="size-3.5" /> Enviar solicitud
        </Button>
      </div>
    </Modal>
  );
}
