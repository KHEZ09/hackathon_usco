"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Boxes, ClipboardPlus, ExternalLink, Factory, History, Plus, RefreshCw, Repeat2, Search } from "lucide-react";
import { useSession } from "@/components/auth/roles";
import { useToast } from "@/components/ui/Toaster";
import {
  ETAPAS,
  MERMA_UMBRAL,
  ORIGENES,
  alertas,
  crearLote,
  fmtFechaHora,
  inventario,
  merma,
  registrarTransformacion,
  siguienteIdLote,
  useDatos,
  useOnline,
  type Origen,
} from "@/lib/store";
import { Button, Card, CardTitle, EstadoBadge, Field, Input, Kpi, Select, Table, Td, Textarea } from "../ui";
import { PanelTabs } from "../PanelTabs";
import { ClusterView } from "../cluster/ClusterView";
import { cn } from "@/lib/cn";
import { ApiOrder, createLot, createOrder, hasApiSession, listLots, listOrders, transformLot, transitionOrder } from "@/lib/orivia-api";
import { sincronizarConBackend, useSincronizacionBackend } from "@/lib/backend-sync";
import { mensajeError } from "@/lib/errores-api";
import { SyncBadge } from "../SyncBadge";

const newIdem = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

export function OperatorPanel() {
  return <PanelTabs operacion={<OperacionOperador />} cluster={<ClusterView rol="operador" />} />;
}

function OperacionOperador() {
  const datos = useDatos();
  const { estado: sync, recargar } = useSincronizacionBackend();
  const totales = useMemo(() => {
    const inv = datos.lotes.map((l) => inventario(datos, l.id));
    return {
      recibido: inv.reduce((a, i) => a + i.recibido, 0),
      disponible: Math.round(inv.reduce((a, i) => a + i.disponible, 0) * 10) / 10,
      producido: Math.round(inv.reduce((a, i) => a + i.producido, 0) * 10) / 10,
    };
  }, [datos]);
  const avisos = alertas(datos).filter((a) => a.tipo === "merma");

  return (
    <div className="space-y-6">
      <SyncBadge estado={sync} onRecargar={() => void recargar()} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Lotes registrados" value={String(datos.lotes.length)} hint="CAC001 · CAC002 · CAC003…" />
        <Kpi label="Kilos recibidos" value={totales.recibido.toLocaleString("es-CO")} unit="kg" />
        <Kpi label="Disponible para transformar" value={totales.disponible.toLocaleString("es-CO")} unit="kg" tone="bien" />
        <Kpi label="Alertas operativas" value={String(avisos.length)} tone={avisos.length ? "alerta" : "normal"} hint={`Merma > ${MERMA_UMBRAL}%`} />
      </div>

      <ApiOrdersCard />
      <ApiLotsCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-6">
          <RecepcionForm />
          <TransformacionForm />
        </div>
        <div className="min-w-0 space-y-6">
          {avisos.length > 0 && (
            <Card className="border-ambar/40 bg-ambar/8">
              <CardTitle icon={<AlertTriangle className="size-4" />} title="Alertas operativas" hint="Se notifican al administrador automáticamente." />
              <ul className="space-y-2 text-xs leading-relaxed">
                {avisos.map((a) => (
                  <li key={a.id} className="rounded-xl bg-card px-3.5 py-2.5">
                    {a.texto}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <InventarioCard />
        </div>
      </div>

      <RegistroCard />
    </div>
  );
}

function ApiLotsCard() {
  const [lots, setLots] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasApiSession()) {
      setLoading(false);
      setError("Inicia sesión con una cuenta del backend para consultar lotes persistidos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setLots(await listLots());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los lotes persistidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <Card className="border-ambar/25 bg-ambar/[0.035]">
      <CardTitle
        icon={<Boxes className="size-4" />}
        title="Lotes persistidos en PostgreSQL"
        hint="Vista real del backend: inventario, merma, historial íntegro y certificados disponibles."
        action={<Button variant="secundario" onClick={() => void refresh()} disabled={loading}><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Actualizar</Button>}
      />
      {error && <p className="mb-3 rounded-xl bg-cereza/10 px-3.5 py-2.5 text-xs text-cereza">{error}</p>}
      <Table head={["Lote", "Origen", "Disponible", "Estado", "Historial", "Eventos / anclajes"]} empty={!loading && lots.length === 0}>
        {lots.map((lot) => {
          const timeline = Array.isArray(lot.timeline) ? lot.timeline as Record<string, unknown>[] : [];
          const anchored = timeline.filter((event) => Boolean(event.blockchain)).length;
          return (
            <tr key={String(lot.id)}>
              <Td className="font-mono text-[0.68rem] font-semibold">{String(lot.id ?? "-")}</Td>
              <Td>{String(lot.origin ?? "-")}</Td>
              <Td>{String(lot.available_kg ?? "-")} / {String(lot.received_kg ?? "-")} kg</Td>
              <Td><EstadoBadge estado={({ PENDING: "PENDIENTE", LIBERATED: "LIBERADO", BLOCKED: "BLOQUEADO" } as Record<string, "PENDIENTE" | "LIBERADO" | "BLOQUEADO">)[String(lot.status ?? "PENDING")] ?? "PENDIENTE"} /></Td>
              <Td>{lot.history_verified ? "Íntegro" : "Revisar"}</Td>
              <Td>{timeline.length} / {anchored} blockchain</Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

const ORDER_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const apiOrderId = (order: ApiOrder) => String(order.id ?? order.order_id ?? "");

function ApiOrdersCard() {
  const { notify } = useToast();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ product: "Cacao de origen", quantity: "", origin: "Rivera", destination: "Centro de transformación" });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await listOrders());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pedidos persistidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    if (!form.product.trim() || !Number.isFinite(quantity) || quantity <= 0 || !form.origin.trim() || !form.destination.trim()) {
      setError("Completa producto, cantidad mayor que cero, origen y destino.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await createOrder({ product: form.product.trim(), quantity, origin: form.origin.trim(), destination: form.destination.trim() });
      setOrders((current) => [response.order, ...current.filter((order) => apiOrderId(order) !== apiOrderId(response.order))]);
      setForm({ ...form, quantity: "" });
      notify("exito", "Pedido persistido", "Se creó el pedido y el backend generó su primer evento de trazabilidad.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "El backend rechazó el pedido.");
      notify("error", "No se creó el pedido", cause instanceof Error ? cause.message : "Respuesta inválida del backend.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (order: ApiOrder, nextStatus: string) => {
    const orderId = apiOrderId(order);
    if (!orderId || !nextStatus) return;
    setSaving(true);
    try {
      const response = await transitionOrder(orderId, nextStatus);
      setOrders((current) => current.map((item) => apiOrderId(item) === orderId ? response.order : item));
      notify("exito", "Estado actualizado", `${orderId} pasó a ${nextStatus}. Se añadió un evento a la cadena.`);
    } catch (cause) {
      notify("error", "No se actualizó el estado", cause instanceof Error ? cause.message : "El backend rechazó la transición.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-bosque-500/25 bg-bosque-500/[0.04]">
      <CardTitle
        icon={<Repeat2 className="size-4" />}
        title="Pedidos operativos persistidos"
        hint="Flujo real contra la API: crear pedido, moverlo por estados y generar eventos que después audita el administrador."
        action={
          <Button variant="secundario" onClick={() => void refresh()} disabled={loading || saving}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Actualizar
          </Button>
        }
      />
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" noValidate>
        <Field label="Producto"><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></Field>
        <Field label="Cantidad"><Input type="number" min="0.1" step="0.1" value={form.quantity} placeholder="120" onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
        <Field label="Origen"><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field>
        <Field label="Destino"><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
        <div className="flex items-end"><Button type="submit" className="w-full py-3" disabled={saving}><Plus className="size-4" /> Crear pedido</Button></div>
      </form>
      {error && <p className="mt-3 rounded-xl bg-cereza/10 px-3.5 py-2.5 text-xs text-cereza">{error}</p>}
      <div className="mt-5">
        <Table head={["Pedido", "Producto", "Ruta", "Cantidad", "Estado", "Siguiente acción"]} empty={!loading && orders.length === 0}>
          {orders.map((order) => {
            const orderId = apiOrderId(order);
            const status = String(order.status ?? "—");
            const options = ORDER_TRANSITIONS[status] ?? [];
            return (
              <tr key={orderId}>
                <Td className="font-mono text-[0.68rem] font-semibold">{orderId || "—"}</Td>
                <Td>{String(order.product ?? "—")}</Td>
                <Td className="max-w-52 text-[0.68rem]">{String(order.origin ?? "—")} → {String(order.destination ?? "—")}</Td>
                <Td>{String(order.quantity ?? "—")}</Td>
                <Td><span className="rounded-full bg-bosque-500/12 px-2.5 py-1 text-[0.62rem] font-bold text-bosque-500">{status}</span></Td>
                <Td>
                  <Select value="" disabled={saving || options.length === 0} onChange={(e) => void changeStatus(order, e.target.value)} aria-label={`Cambiar estado de ${orderId}`} className="w-auto min-w-36 py-2 text-xs">
                    <option value="">{options.length ? "Cambiar estado" : "Sin acciones"}</option>
                    {options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Select>
                </Td>
              </tr>
            );
          })}
        </Table>
      </div>
    </Card>
  );
}

function RecepcionForm() {
  const datos = useDatos();
  const session = useSession();
  const { notify } = useToast();
  const [form, setForm] = useState({ id: "", producto: "Cacao de montaña", productor: "", origen: "Rivera" as Origen, kg: "", fecha: hoy() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sugerido = siguienteIdLote(datos);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasApiSession() && process.env.NEXT_PUBLIC_ORIVIA_DEMO_MODE !== "true") {
      const message = "La operación real requiere iniciar sesión en el backend.";
      setError(message);
      notify("error", "Sesión requerida", message);
      return;
    }
    const id = form.id || sugerido;
    setSaving(true);
    if (hasApiSession()) {
      try {
        await createLot({
          lot_id: id,
          product: form.producto,
          producer: form.productor,
          origin: `${form.origen}, Huila`,
          received_kg: Number(form.kg),
          received_at: form.fecha,
        });
      } catch (remoteError) {
        const message = mensajeError(remoteError, "No se pudo guardar la recepción en el servidor.");
        setError(message);
        notify("error", "Lote no registrado", message);
        setSaving(false);
        return;
      }
    }
    const r = crearLote(
      { id, productor: form.productor, origen: form.origen, recibidoKg: Number(form.kg), fecha: form.fecha },
      { email: session?.email ?? "operador@orivia.co" },
    );
    if (!r.ok) {
      if (!hasApiSession()) {
        setError(r.error);
        notify("error", "Lote no registrado", r.error);
        setSaving(false);
        return;
      }
    }
    if (hasApiSession()) await sincronizarConBackend().catch(() => undefined);
    setError(null);
    notify("exito", "Lote recibido", hasApiSession() ? "Persistido en la API y reflejado en el panel." : r.ok ? r.mensaje : "Lote reflejado en el panel local.");
    setForm({ id: "", producto: "Cacao de montaña", productor: "", origen: form.origen, kg: "", fecha: hoy() });
    setSaving(false);
  };

  return (
    <Card>
      <CardTitle icon={<ClipboardPlus className="size-4" />} title="Recepción de lote" hint="RF01 · cantidades mayores que 0 e identificador único." />
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Identificador único">
          <Input value={form.id} placeholder={sugerido} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Nombre del productor">
          <Input value={form.productor} placeholder="Productor D" onChange={(e) => setForm({ ...form, productor: e.target.value })} />
        </Field>
        <Field label="Producto">
          <Input value={form.producto} placeholder="Cacao de montaña" onChange={(e) => setForm({ ...form, producto: e.target.value })} />
        </Field>
        <Field label="Origen">
          <Select value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value as Origen })}>
            {ORIGENES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cantidad recibida (kg)">
          <Input type="number" inputMode="decimal" step="0.1" value={form.kg} placeholder="120" onChange={(e) => setForm({ ...form, kg: e.target.value })} />
        </Field>
        <Field label="Fecha de recepción">
          <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={saving} className="w-full py-3">
            <ClipboardPlus className="size-4" /> Registrar lote
          </Button>
        </div>
        <ErrorLine error={error} />
      </form>
    </Card>
  );
}

type Payload = { loteId: string; etapa: string; entradaKg: number; salidaKg: number; responsable: string; incidencias: string; idem: string };

function TransformacionForm() {
  const datos = useDatos();
  const session = useSession();
  const online = useOnline();
  const { notify } = useToast();
  const disponibles = datos.lotes.filter((l) => l.estado !== "BLOQUEADO" && inventario(datos, l.id).disponible > 0);
  const [form, setForm] = useState({ loteId: "", etapa: ETAPAS[0], entrada: "", salida: "", responsable: "", incidencias: "" });
  const [idem, setIdem] = useState(newIdem);
  const [ultimo, setUltimo] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loteId = form.loteId || disponibles[0]?.id || "";
  const inv = loteId ? inventario(datos, loteId) : null;
  const entrada = Number(form.entrada);
  const salida = Number(form.salida);
  const mermaPrevia = entrada > 0 && salida > 0 ? merma({ entradaKg: entrada, salidaKg: salida }) : null;

  const enviar = async (payload: Payload, reenvio = false) => {
    setSaving(true);
    if (!hasApiSession() && process.env.NEXT_PUBLIC_ORIVIA_DEMO_MODE !== "true") {
      const message = "La operación real requiere iniciar sesión en el backend.";
      setError(message);
      notify("error", "Sesión requerida", message);
      setSaving(false);
      return;
    }
    if (hasApiSession()) {
      try {
        const remote = await transformLot({
          lot_id: payload.loteId,
          operation_code: payload.idem,
          stage: payload.etapa,
          responsible: payload.responsable,
          input_kg: payload.entradaKg,
          output_kg: payload.salidaKg,
          incident: payload.incidencias,
        });
        registrarTransformacion(payload, { email: session?.email ?? "operador@orivia.co" }, true);
        // El servidor es la fuente de verdad: se vuelve a leer el lote ya transformado.
        await sincronizarConBackend().catch(() => undefined);
        setError(null);
        notify("exito", remote.idempotent ? "Reenvío idempotente" : "Transformación registrada", remote.idempotent ? "La API no duplicó la operación." : "API persistida · merma calculada y trazabilidad actualizada.");
        setUltimo(payload);
        setIdem(newIdem());
        setForm({ ...form, entrada: "", salida: "", incidencias: "" });
        setSaving(false);
        return;
      } catch (remoteError) {
        const message = mensajeError(remoteError, "No se pudo guardar la transformación en el servidor.");
        setError(reenvio ? null : message);
        notify(reenvio ? "info" : "error", reenvio ? "Reenvío bloqueado" : "Transformación rechazada", message);
        setSaving(false);
        return;
      }
    }
    const r = registrarTransformacion(payload, { email: session?.email ?? "operador@orivia.co" }, online);
    if (!r.ok) {
      setError(reenvio ? null : r.error);
      notify(reenvio ? "info" : "error", reenvio ? "Reenvío bloqueado" : "Transformación rechazada", r.error);
      setSaving(false);
      return;
    }
    setError(null);
    notify("exito", "Transformación registrada", r.mensaje);
    setUltimo(payload);
    setIdem(newIdem());
    setForm({ ...form, entrada: "", salida: "", incidencias: "" });
    setSaving(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    enviar({ loteId, etapa: form.etapa, entradaKg: entrada, salidaKg: salida, responsable: form.responsable, incidencias: form.incidencias, idem });
  };

  return (
    <Card>
      <CardTitle
        icon={<Factory className="size-4" />}
        title="Registrar transformación"
        hint="RF02 · RF08 · no se puede consumir más de lo disponible."
        action={
          ultimo && (
            <Button type="button" variant="secundario" onClick={() => enviar(ultimo, true)} title="Reenvía la última operación con la misma clave de idempotencia">
              <Repeat2 className="size-3.5" /> Reenviar última
            </Button>
          )
        }
      />
      {disponibles.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-ink-soft">
          No hay lotes con inventario disponible. Registra una recepción para continuar.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Lote de origen">
            <Select value={loteId} onChange={(e) => setForm({ ...form, loteId: e.target.value })}>
              {disponibles.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · {l.origen} · {inventario(datos, l.id).disponible} kg
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa">
            <Select value={form.etapa} onChange={(e) => setForm({ ...form, etapa: e.target.value })}>
              {ETAPAS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label={`Entrada (kg) · disponible ${inv?.disponible ?? 0} kg`}>
            <Input type="number" inputMode="decimal" step="0.1" value={form.entrada} placeholder="100" onChange={(e) => setForm({ ...form, entrada: e.target.value })} />
          </Field>
          <Field label="Salida (kg)">
            <Input type="number" inputMode="decimal" step="0.1" value={form.salida} placeholder="80" onChange={(e) => setForm({ ...form, salida: e.target.value })} />
          </Field>
          <Field label="Responsable">
            <Input value={form.responsable} placeholder="Operador de beneficio" onChange={(e) => setForm({ ...form, responsable: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <div
              className={cn(
                "w-full rounded-xl px-3.5 py-2.5 text-xs",
                mermaPrevia === null && "bg-surface-2 text-ink-soft",
                mermaPrevia !== null && mermaPrevia > MERMA_UMBRAL && "bg-ambar/15 text-ambar",
                mermaPrevia !== null && mermaPrevia <= MERMA_UMBRAL && "bg-bosque-500/12 text-bosque-500",
              )}
            >
              {mermaPrevia === null ? "Merma calculada al ingresar entrada y salida" : `Merma estimada: ${mermaPrevia}%${mermaPrevia > MERMA_UMBRAL ? " · generará alerta" : ""}`}
            </div>
          </div>
          <Field label="Incidencias (obligatorio si la salida supera la entrada)" className="sm:col-span-2">
            <Textarea value={form.incidencias} placeholder="Lluvia durante el secado, cambio de cajón…" onChange={(e) => setForm({ ...form, incidencias: e.target.value })} />
          </Field>
          <ErrorLine error={error} />
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <p className="font-mono text-[0.62rem] text-ink-soft">clave de idempotencia · {idem.slice(0, 8)}</p>
            <Button type="submit" disabled={saving} className="px-6 py-3">
              <Factory className="size-4" /> Registrar transformación
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl bg-cereza/10 px-3.5 py-2.5 text-xs font-medium text-cereza sm:col-span-2"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function InventarioCard() {
  const datos = useDatos();
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState<"todos" | Origen>("todos");
  const filas = datos.lotes.filter(
    (l) => (origen === "todos" || l.origen === origen) && `${l.id} ${l.productor} ${l.finca}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Card>
      <CardTitle
        icon={<Boxes className="size-4" />}
        title="Inventario por lote"
        hint="Recibido, consumido y disponible."
        action={
          <div className="flex gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar lote" className="w-32 py-2 pl-8 text-xs" />
            </label>
            <Select value={origen} onChange={(e) => setOrigen(e.target.value as typeof origen)} aria-label="Filtrar por origen" className="w-auto py-2 text-xs">
              <option value="todos">Todos</option>
              {ORIGENES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </div>
        }
      />
      <Table head={["Lote", "Origen", "Recibido", "Consumido", "Disponible", "Estado", ""]} empty={filas.length === 0}>
        {filas.map((l) => {
          const inv = inventario(datos, l.id);
          const pct = inv.recibido > 0 ? (inv.disponible / inv.recibido) * 100 : 0;
          return (
            <tr key={l.id}>
              <Td className="font-mono font-semibold">{l.id}</Td>
              <Td>
                {l.origen}
                <span className="block text-[0.65rem] text-ink-soft">{l.productor}</span>
              </Td>
              <Td>{inv.recibido} kg</Td>
              <Td>{inv.consumido} kg</Td>
              <Td>
                <span className="font-semibold">{inv.disponible} kg</span>
                <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-bosque-500" style={{ width: `${pct}%` }} />
                </span>
              </Td>
              <Td>
                <EstadoBadge estado={l.estado} />
              </Td>
              <Td>
                <Link href={`/ficha/${l.id}`} className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-bosque-500 hover:underline">
                  Ficha <ExternalLink className="size-3" />
                </Link>
              </Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

function RegistroCard() {
  const datos = useDatos();
  const filas = [...datos.transformaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <Card>
      <CardTitle icon={<History className="size-4" />} title="Registro de transformaciones" hint="Se actualiza en tiempo real al enviar el formulario." />
      <Table head={["ID", "Fecha", "Lote", "Etapa", "Entrada → salida", "Merma", "Responsable", "Sincronización"]} empty={filas.length === 0}>
        <AnimatePresence initial={false}>
          {filas.map((t) => {
            const m = merma(t);
            return (
              <motion.tr key={t.id} layout initial={{ opacity: 0, backgroundColor: "rgba(63,122,94,0.18)" }} animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }} transition={{ duration: 1.2 }}>
                <Td className="font-mono text-[0.68rem] text-ink-soft">{t.id}</Td>
                <Td>{fmtFechaHora(t.fecha)}</Td>
                <Td className="font-mono font-semibold">{t.loteId}</Td>
                <Td>
                  {t.etapa}
                  {t.incidencias && <span className="block max-w-56 truncate text-[0.65rem] text-ink-soft">{t.incidencias}</span>}
                </Td>
                <Td>
                  {t.entradaKg} → {t.salidaKg} kg
                </Td>
                <Td>
                  <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-bold", m > MERMA_UMBRAL ? "bg-ambar/15 text-ambar" : "bg-bosque-500/12 text-bosque-500")}>
                    {m}%
                  </span>
                </Td>
                <Td>{t.responsable}</Td>
                <Td>
                  <span className={cn("text-[0.68rem] font-semibold", t.sync === "pendiente" ? "text-ambar" : "text-ink-soft")}>
                    {t.sync === "pendiente" ? "Pendiente (nodo local)" : "Sincronizado"}
                  </span>
                </Td>
              </motion.tr>
            );
          })}
        </AnimatePresence>
      </Table>
    </Card>
  );
}
