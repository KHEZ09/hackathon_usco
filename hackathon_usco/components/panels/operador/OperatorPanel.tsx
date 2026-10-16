"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Boxes, ClipboardPlus, ExternalLink, Factory, History, Repeat2, Search } from "lucide-react";
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

const newIdem = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

export function OperatorPanel() {
  return <PanelTabs operacion={<OperacionOperador />} cluster={<ClusterView rol="operador" />} />;
}

function OperacionOperador() {
  const datos = useDatos();
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Lotes registrados" value={String(datos.lotes.length)} hint="CAC001 · CAC002 · CAC003…" />
        <Kpi label="Kilos recibidos" value={totales.recibido.toLocaleString("es-CO")} unit="kg" />
        <Kpi label="Disponible para transformar" value={totales.disponible.toLocaleString("es-CO")} unit="kg" tone="bien" />
        <Kpi label="Alertas operativas" value={String(avisos.length)} tone={avisos.length ? "alerta" : "normal"} hint={`Merma > ${MERMA_UMBRAL}%`} />
      </div>

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

function RecepcionForm() {
  const datos = useDatos();
  const session = useSession();
  const { notify } = useToast();
  const [form, setForm] = useState({ id: "", productor: "", origen: "Rivera" as Origen, kg: "", fecha: hoy() });
  const [error, setError] = useState<string | null>(null);
  const sugerido = siguienteIdLote(datos);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = crearLote(
      { id: form.id || sugerido, productor: form.productor, origen: form.origen, recibidoKg: Number(form.kg), fecha: form.fecha },
      { email: session?.email ?? "operador@orivia.co" },
    );
    if (!r.ok) {
      setError(r.error);
      notify("error", "Lote no registrado", r.error);
      return;
    }
    setError(null);
    notify("exito", "Lote recibido", r.mensaje);
    setForm({ id: "", productor: "", origen: form.origen, kg: "", fecha: hoy() });
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
          <Button type="submit" className="w-full py-3">
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

  const loteId = form.loteId || disponibles[0]?.id || "";
  const inv = loteId ? inventario(datos, loteId) : null;
  const entrada = Number(form.entrada);
  const salida = Number(form.salida);
  const mermaPrevia = entrada > 0 && salida > 0 ? merma({ entradaKg: entrada, salidaKg: salida }) : null;

  const enviar = (payload: Payload, reenvio = false) => {
    const r = registrarTransformacion(payload, { email: session?.email ?? "operador@orivia.co" }, online);
    if (!r.ok) {
      setError(reenvio ? null : r.error);
      notify(reenvio ? "info" : "error", reenvio ? "Reenvío bloqueado" : "Transformación rechazada", r.error);
      return;
    }
    setError(null);
    notify("exito", "Transformación registrada", r.mensaje);
    setUltimo(payload);
    setIdem(newIdem());
    setForm({ ...form, entrada: "", salida: "", incidencias: "" });
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
            <Button type="submit" className="px-6 py-3">
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
