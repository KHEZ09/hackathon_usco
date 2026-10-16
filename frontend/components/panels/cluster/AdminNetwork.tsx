"use client";

import { useState } from "react";
import { CheckCircle2, Inbox, Lock, PlusCircle, ShieldAlert, ShieldCheck, Undo2, UserCheck, Users, XCircle } from "lucide-react";
import { Button, Card, CardTitle, Field, Select, Table, Td, Textarea } from "../ui";
import { Modal } from "../Modal";
import { TrustBadge } from "./TrustPanel";
import { useSession } from "@/components/auth/roles";
import { useToast } from "@/components/ui/Toaster";
import { fmtFechaHora } from "@/lib/store";
import {
  ASOCIACION_ID,
  ESTADO_ACTOR,
  ESTADO_CONEXION,
  SENAL_LABEL,
  TIPO_ACTOR,
  actorPorId,
  cambiarEstadoActor,
  cancelarConexion,
  registrarSenal,
  responderConexion,
  simularRespuestaContraparte,
  useCluster,
  type Conexion,
  type EstadoActor,
  type TipoSenal,
} from "@/lib/cluster";
import { cn } from "@/lib/cn";

type Dialogo =
  | { tipo: "rechazar"; conexion: Conexion }
  | { tipo: "estado"; actorId: string; estado: EstadoActor }
  | { tipo: "senal"; actorId: string }
  | null;

/** Gestión de la red exclusiva del administrador: consentimiento, moderación y confianza. */
export function AdminNetwork({ onActor }: { onActor: (id: string) => void }) {
  const cluster = useCluster();
  const session = useSession();
  const { notify } = useToast();
  const actor = { email: session?.email ?? "admin@orivia.co", role: "administrador" };
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [bandeja, setBandeja] = useState<"recibidas" | "enviadas">("recibidas");

  const recibidas = cluster.conexiones.filter((x) => x.destinoId === ASOCIACION_ID).slice().reverse();
  const enviadas = cluster.conexiones.filter((x) => x.solicitanteId === ASOCIACION_ID).slice().reverse();
  const lista = bandeja === "recibidas" ? recibidas : enviadas;
  const r = (res: { ok: boolean; mensaje?: string; error?: string }, titulo: string) =>
    notify(res.ok ? "exito" : "error", res.ok ? titulo : "No se aplicó el cambio", res.ok ? res.mensaje : res.error);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle
            icon={<Inbox className="size-4" />}
            title="Solicitudes de conexión"
            hint="Aceptar comparte solo el contacto y las condiciones autorizadas. Rechazar exige motivo y no revela nada."
          />
          <div className="mb-3 flex gap-1.5 rounded-full bg-surface-2 p-1" role="tablist" aria-label="Bandeja">
            {(
              [
                ["recibidas", `Recibidas (${recibidas.filter((x) => x.estado === "REQUESTED").length} pendientes)`],
                ["enviadas", `Enviadas (${enviadas.filter((x) => x.estado === "REQUESTED").length} pendientes)`],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                role="tab"
                aria-selected={bandeja === v}
                onClick={() => setBandeja(v)}
                className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition", bandeja === v ? "bg-bosque text-crema" : "text-ink-soft hover:text-ink")}
              >
                {l}
              </button>
            ))}
          </div>
          <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {lista.map((x) => {
              const otro = actorPorId(cluster, bandeja === "recibidas" ? x.solicitanteId : x.destinoId);
              return (
                <li key={x.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button onClick={() => otro && onActor(otro.id)} className="text-left text-sm font-semibold hover:underline">
                      {otro?.nombre ?? "Actor"}
                    </button>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.6rem] font-bold tracking-wider",
                        x.estado === "REQUESTED" && "bg-ambar/15 text-ambar",
                        x.estado === "ACCEPTED" && "bg-bosque-500/15 text-bosque-500",
                        (x.estado === "REJECTED" || x.estado === "CANCELLED") && "bg-cereza/15 text-[#f08a8c]",
                      )}
                    >
                      {ESTADO_CONEXION[x.estado].toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.72rem] leading-relaxed text-ink-soft">“{x.mensaje}”</p>
                  <p className="mt-1 font-mono text-[0.6rem] text-ink-soft">
                    {x.id} · {x.tipo} · {fmtFechaHora(x.creada)}
                    {x.decidida && ` · respondida ${fmtFechaHora(x.decidida)} por ${x.decididaPor}`}
                    {x.motivo && ` · motivo: ${x.motivo}`}
                  </p>
                  {x.estado === "REQUESTED" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {bandeja === "recibidas" ? (
                        <>
                          <Button onClick={() => r(responderConexion(x.id, "ACCEPTED", "", actor), "Conexión aceptada")}>
                            <CheckCircle2 className="size-3.5" /> Aceptar
                          </Button>
                          <Button variant="secundario" onClick={() => setDialogo({ tipo: "rechazar", conexion: x })}>
                            <XCircle className="size-3.5" /> Rechazar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secundario" onClick={() => r(cancelarConexion(x.id, actor), "Solicitud cancelada")}>
                            <Undo2 className="size-3.5" /> Cancelar
                          </Button>
                          <Button variant="fantasma" onClick={() => r(simularRespuestaContraparte(x.id, "ACCEPTED", actor), "Respuesta simulada")}>
                            Simular aceptación (demo)
                          </Button>
                          <Button variant="fantasma" onClick={() => r(simularRespuestaContraparte(x.id, "REJECTED", actor), "Respuesta simulada")}>
                            Simular rechazo (demo)
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {!lista.length && <p className="py-6 text-center text-xs text-ink-soft">Sin solicitudes.</p>}
          </ul>
        </Card>

        <Card>
          <CardTitle icon={<ShieldCheck className="size-4" />} title="Señales de confianza registradas" hint="Historial append-only: cada señal cambia la puntuación trust-v1 y queda en auditoría." />
          <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {cluster.senales
              .slice()
              .reverse()
              .map((s) => (
                <li key={s.id} className="rounded-2xl border border-line bg-surface px-4 py-3 text-[0.72rem]">
                  <p className="font-semibold">
                    {SENAL_LABEL[s.tipo]} · {actorPorId(cluster, s.actorId)?.nombre}
                  </p>
                  <p className="text-ink-soft">{s.nota}</p>
                  <p className="mt-1 font-mono text-[0.6rem] text-ink-soft">
                    {s.quien} · {fmtFechaHora(s.cuando)}
                  </p>
                </li>
              ))}
            {!cluster.senales.length && (
              <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-xs leading-relaxed text-ink-soft">
                Aún no hay señales nuevas. Registra evidencias, eventos verificados, controles o incidencias desde la tabla de actores.
              </p>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle icon={<Users className="size-4" />} title="Actores de la red" hint="Moderación y datos privados (solo administración). Suspender o bloquear exige motivo y cancela solicitudes pendientes." />
        <Table head={["Actor", "Tipo", "Municipio", "Visibilidad", "Estado", "Confianza", "Contacto (compartido)", "Acciones"]}>
          {cluster.actores.map((a) => (
            <tr key={a.id}>
              <Td>
                <button onClick={() => onActor(a.id)} className="text-left font-semibold hover:underline">
                  {a.nombre}
                </button>
                <span className="block max-w-56 truncate text-[0.65rem] text-ink-soft" title={a.notasInternas}>
                  <Lock className="mr-1 inline size-3" />
                  {a.notasInternas}
                </span>
              </Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: TIPO_ACTOR[a.tipo].color }} /> {TIPO_ACTOR[a.tipo].label}
                </span>
              </Td>
              <Td>{a.municipio}</Td>
              <Td>{a.visibilidad === "PUBLIC" ? "Pública" : a.visibilidad === "SHARED" ? "Compartida" : "Privada"}</Td>
              <Td>
                <span className={cn("text-[0.7rem] font-semibold", a.estado === "ACTIVE" ? "text-bosque-500" : a.estado === "PENDING" ? "text-ambar" : "text-[#f08a8c]")}>
                  {ESTADO_ACTOR[a.estado]}
                </span>
              </Td>
              <Td>
                <TrustBadge senales={a.senales} />
              </Td>
              <Td className="font-mono text-[0.65rem] text-ink-soft">{a.contacto.email}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <IconBtn label="Registrar señal de confianza" onClick={() => setDialogo({ tipo: "senal", actorId: a.id })}>
                    <PlusCircle className="size-4" />
                  </IconBtn>
                  {a.id !== ASOCIACION_ID && a.estado !== "ACTIVE" && (
                    <IconBtn label={a.estado === "PENDING" ? "Verificar y activar" : "Reactivar"} onClick={() => setDialogo({ tipo: "estado", actorId: a.id, estado: "ACTIVE" })}>
                      <UserCheck className="size-4 text-bosque-500" />
                    </IconBtn>
                  )}
                  {a.id !== ASOCIACION_ID && a.estado === "ACTIVE" && (
                    <IconBtn label="Suspender" onClick={() => setDialogo({ tipo: "estado", actorId: a.id, estado: "SUSPENDED" })}>
                      <ShieldAlert className="size-4 text-ambar" />
                    </IconBtn>
                  )}
                  {a.id !== ASOCIACION_ID && a.estado !== "BLOCKED" && (
                    <IconBtn label="Bloquear" onClick={() => setDialogo({ tipo: "estado", actorId: a.id, estado: "BLOCKED" })}>
                      <XCircle className="size-4 text-[#f08a8c]" />
                    </IconBtn>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Dialogos dialogo={dialogo} onClose={() => setDialogo(null)} actor={actor} onDone={r} />
    </>
  );
}

function Dialogos({
  dialogo,
  onClose,
  actor,
  onDone,
}: {
  dialogo: Dialogo;
  onClose: () => void;
  actor: { email: string; role: string };
  onDone: (res: { ok: boolean; mensaje?: string; error?: string }, titulo: string) => void;
}) {
  const cluster = useCluster();
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoSenal>("EVIDENCIA");
  const [error, setError] = useState<string | null>(null);
  const cerrar = () => {
    setTexto("");
    setError(null);
    onClose();
  };
  const aplicar = (res: { ok: boolean; mensaje?: string; error?: string }, titulo: string) => {
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    onDone(res, titulo);
    cerrar();
  };

  const nombre = dialogo && dialogo.tipo !== "rechazar" ? actorPorId(cluster, dialogo.actorId)?.nombre : "";
  const titulo =
    dialogo?.tipo === "rechazar"
      ? "Rechazar solicitud de conexión"
      : dialogo?.tipo === "senal"
        ? `Registrar señal · ${nombre}`
        : dialogo?.tipo === "estado"
          ? `${dialogo.estado === "ACTIVE" ? "Activar" : dialogo.estado === "SUSPENDED" ? "Suspender" : "Bloquear"} · ${nombre}`
          : "";

  return (
    <Modal open={!!dialogo} onClose={cerrar} titulo={titulo} subtitulo="El cambio queda en la auditoría con quién, cuándo y motivo.">
      {dialogo?.tipo === "senal" && (
        <Field label="Tipo de señal" className="mb-3">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoSenal)}>
            {(Object.keys(SENAL_LABEL) as TipoSenal[]).map((t) => (
              <option key={t} value={t}>
                {SENAL_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label={dialogo?.tipo === "senal" ? "Evidencia o descripción (obligatoria)" : dialogo?.tipo === "estado" && dialogo.estado === "ACTIVE" ? "Nota (opcional)" : "Motivo (obligatorio)"}
        error={error ?? undefined}
      >
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus placeholder={dialogo?.tipo === "senal" ? "Ej.: certificado de análisis sensorial del lote CAC002" : "Explica la decisión"} />
      </Field>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="fantasma" onClick={cerrar}>
          Cancelar
        </Button>
        <Button
          variant={dialogo?.tipo === "estado" && dialogo.estado !== "ACTIVE" ? "peligro" : dialogo?.tipo === "rechazar" ? "peligro" : "primario"}
          onClick={() => {
            if (!dialogo) return;
            if (dialogo.tipo === "rechazar") aplicar(responderConexion(dialogo.conexion.id, "REJECTED", texto, actor), "Solicitud rechazada");
            if (dialogo.tipo === "estado") aplicar(cambiarEstadoActor(dialogo.actorId, dialogo.estado, texto, actor), "Estado del actor actualizado");
            if (dialogo.tipo === "senal") aplicar(registrarSenal(dialogo.actorId, tipo, texto, actor), "Señal registrada");
          }}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink">
      {children}
    </button>
  );
}
