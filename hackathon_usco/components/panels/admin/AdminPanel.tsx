"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  ExternalLink,
  Lock,
  Network,
  RefreshCw,
  RotateCcw,
  Server,
  ScrollText,
  Search,
  ShieldCheck,
  Unlock,
  X,
} from "lucide-react";
import { useSession } from "@/components/auth/roles";
import { useToast } from "@/components/ui/Toaster";
import { cop } from "@/lib/demo-data";
import {
  MERMA_UMBRAL,
  ORIGENES,
  actualizarEconomia,
  alertas,
  cambiarEstado,
  economia,
  exportarCsv,
  fmtFechaHora,
  inventario,
  mermaLote,
  restablecerDemo,
  useDatos,
  type Estado,
  type Lote,
} from "@/lib/store";
import { Button, Card, CardTitle, EstadoBadge, Field, Input, Kpi, Select, Table, Td, Textarea } from "../ui";
import { ProvenanceGraph } from "./ProvenanceGraph";
import { AiAssistant } from "./AiAssistant";
import { cn } from "@/lib/cn";
import { PanelTabs } from "../PanelTabs";
import { ClusterView } from "../cluster/ClusterView";
import { ASOCIACION_ID, useCluster } from "@/lib/cluster";
import { syncIntegration, useKevinOverview } from "@/lib/orivia-api";

type Dialogo = { tipo: "bloquear" | "liberar"; lote: Lote } | { tipo: "reset" } | null;

export function AdminPanel() {
  const cluster = useCluster();
  const pendientes = cluster.conexiones.filter((x) => x.destinoId === ASOCIACION_ID && x.estado === "REQUESTED").length;
  return <PanelTabs operacion={<OperacionAdmin />} cluster={<ClusterView rol="administrador" />} badge={pendientes} />;
}

function OperacionAdmin() {
  const datos = useDatos();
  const session = useSession();
  const { notify } = useToast();
  const [sel, setSel] = useState("CAC001");
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const actor = { email: session?.email ?? "admin@orivia.test", role: session?.role ?? "administrador" };
  const lista = alertas(datos);
  const backend = useKevinOverview(Boolean(session));
  const [syncing, setSyncing] = useState(false);

  const sincronizarProveedor = async () => {
    setSyncing(true);
    try {
      const result = await syncIntegration("orivia-demo");
      notify("exito", "Integración sincronizada", typeof result.message === "string" ? result.message : "El adaptador respondió correctamente.");
    } catch (error) {
      notify("error", "No se pudo sincronizar", error instanceof Error ? error.message : "El backend rechazó la operación.");
    } finally {
      setSyncing(false);
    }
  };

  const kpis = useMemo(() => {
    const inv = datos.lotes.map((l) => inventario(datos, l.id));
    const consumido = inv.reduce((a, i) => a + i.consumido, 0);
    const producido = inv.reduce((a, i) => a + i.producido, 0);
    const ecos = datos.lotes.map((l) => economia(datos, l));
    const kg = ecos.reduce((a, e) => a + e.kgBase, 0);
    const costo = datos.lotes.reduce((a, l) => a + l.costoTotalCop, 0);
    const ingreso = ecos.reduce((a, e) => a + e.ingreso, 0);
    return {
      yield: consumido > 0 ? Math.round((producido / consumido) * 1000) / 10 : 0,
      merma: consumido > 0 ? Math.round(((consumido - producido) / consumido) * 1000) / 10 : 0,
      costoUnitario: kg > 0 ? costo / kg : 0,
      margen: ingreso > 0 ? Math.round(((ingreso - costo) / ingreso) * 1000) / 10 : 0,
    };
  }, [datos]);

  const cac001 = datos.lotes.find((l) => l.id === "CAC001");

  return (
    <div className="space-y-6">
      {/* RF04: alerta automática */}
      <AnimatePresence>
        {lista.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3 rounded-[1.5rem] border border-cereza/40 bg-gradient-to-r from-cereza/25 via-cereza/10 to-ambar/10 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertOctagon className="mt-0.5 size-6 shrink-0 text-[#f08a8c]" />
              <div>
                <p className="text-sm font-semibold">
                  {lista.length} alerta{lista.length > 1 ? "s" : ""} automática{lista.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
                  {lista.map((a) => (
                    <li key={a.id}>
                      <button onClick={() => setSel(a.loteId)} className="text-left hover:text-ink hover:underline">
                        {a.texto}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button variant="secundario" onClick={() => setSel(lista[0].loteId)} className="shrink-0">
              Analizar {lista[0].loteId}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-bosque-500/25 bg-bosque-500/[0.04]">
        <CardTitle
          icon={<Server className="size-4" />}
          title="Datos persistidos de Kevin"
          hint="Reportes, inventario y márgenes leídos desde PostgreSQL; los valores locales siguen disponibles como respaldo visual."
          action={
            <Button variant="secundario" onClick={sincronizarProveedor} disabled={syncing}>
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Sincronizando" : "Probar integración"}
            </Button>
          }
        />
        {backend.loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />)}
          </div>
        ) : backend.error ? (
          <p className="rounded-2xl bg-ambar/10 px-4 py-3 text-xs text-ink-soft">
            El backend no respondió: {backend.error} Configura <code>NEXT_PUBLIC_ORIVIA_API_URL</code> y vuelve a iniciar sesión.
          </p>
        ) : backend.data ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-surface-2 p-4"><p className="text-[0.68rem] text-ink-soft">Inventarios</p><p className="mt-1 text-xl font-semibold">{backend.data.inventory.length}</p><p className="text-[0.65rem] text-ink-soft">filas desde PostgreSQL</p></div>
            <div className="rounded-2xl bg-surface-2 p-4"><p className="text-[0.68rem] text-ink-soft">Alertas abiertas</p><p className="mt-1 text-xl font-semibold text-ambar">{backend.data.alerts.length}</p><p className="text-[0.65rem] text-ink-soft">reglas económicas</p></div>
            <div className="rounded-2xl bg-surface-2 p-4"><p className="text-[0.68rem] text-ink-soft">Pedidos</p><p className="mt-1 text-xl font-semibold">{backend.data.orders?.order_count ?? 0}</p><p className="text-[0.65rem] text-ink-soft">resumen persistido</p></div>
            <div className="rounded-2xl bg-surface-2 p-4"><p className="text-[0.68rem] text-ink-soft">Márgenes</p><p className="mt-1 text-xl font-semibold text-bosque-500">{backend.margins.length}</p><p className="text-[0.65rem] text-ink-soft">cálculos disponibles</p></div>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Yield de operación" value={`${kpis.yield}`} unit="%" hint="kg producidos / kg consumidos" tone="bien" />
        <Kpi label="Merma global" value={`${kpis.merma}`} unit="%" hint={`Umbral por transformación: ${MERMA_UMBRAL}%`} tone={kpis.merma > MERMA_UMBRAL ? "alerta" : "normal"} />
        <Kpi label="Costo unitario promedio" value={cop.format(kpis.costoUnitario)} unit="/kg" hint="Costo total / kg producidos" />
        <Kpi label="Margen estimado" value={`${kpis.margen}`} unit="%" hint="(ingreso − costo) / ingreso" tone={kpis.margen >= 15 ? "bien" : "alerta"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardTitle
            icon={<Network className="size-4" />}
            title="Grafo de procedencia"
            hint="Lote origen → transformación → producto. Arrastra para rotar, pasa el cursor y haz clic en un nodo."
            action={
              <Select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Lote seleccionado" className="w-auto py-2 text-xs">
                {datos.lotes.map((l) => (
                  <option key={l.id}>{l.id}</option>
                ))}
              </Select>
            }
          />
          <ProvenanceGraph datos={datos} seleccionado={sel} onSelect={setSel} />
        </Card>
        <Card className="lg:col-span-4">
          <AiAssistant key={sel} datos={datos} loteId={sel} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* RF09 / RF10: incidencia de la hora 12 */}
        <Card className="border-cereza/30 lg:col-span-5">
          <CardTitle icon={<Lock className="size-4" />} title="Acción crítica · incidencia" hint="Bloquear exige motivo y deja auditoría sin borrar historial." />
          {cac001 && (
            <div className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-semibold">CAC001</p>
                <EstadoBadge estado={cac001.estado} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Merma del {mermaLote(datos, "CAC001")}% frente al umbral de {MERMA_UMBRAL}%. Al bloquearlo, la ficha pública lo mostrará como no disponible.
              </p>
              {cac001.estado === "BLOQUEADO" ? (
                <Button variant="secundario" className="mt-4 w-full py-3" onClick={() => setDialogo({ tipo: "liberar", lote: cac001 })}>
                  <Unlock className="size-4" /> Liberar CAC001
                </Button>
              ) : (
                <Button variant="peligro" className="mt-4 w-full py-3" onClick={() => setDialogo({ tipo: "bloquear", lote: cac001 })}>
                  <Lock className="size-4" /> Bloquear lote CAC001
                </Button>
              )}
            </div>
          )}
        </Card>
        <BalanceCard loteId={sel} actor={actor} />
      </div>

      <LotesCard onAccion={setDialogo} onSelect={setSel} />
      <AuditoriaCard />

      <div className="flex justify-end">
        <Button variant="fantasma" onClick={() => setDialogo({ tipo: "reset" })}>
          <RotateCcw className="size-3.5" /> Restablecer datos de demostración
        </Button>
      </div>

      <AnimatePresence>
        {dialogo && (
          <ConfirmDialog
            dialogo={dialogo}
            onClose={() => setDialogo(null)}
            onConfirm={(motivo) => {
              if (dialogo.tipo === "reset") {
                restablecerDemo();
                notify("info", "Datos restablecidos", "Se cargaron de nuevo CAC001, CAC002 y CAC003.");
                setDialogo(null);
                return;
              }
              const estado: Estado = dialogo.tipo === "bloquear" ? "BLOQUEADO" : "LIBERADO";
              const r = cambiarEstado(dialogo.lote.id, estado, motivo, actor);
              notify(r.ok ? "exito" : "error", r.ok ? `${dialogo.lote.id} ${estado.toLowerCase()}` : "No se cambió el estado", r.ok ? r.mensaje : r.error);
              if (r.ok) setDialogo(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BalanceCard({ loteId, actor }: { loteId: string; actor: { email: string } }) {
  const datos = useDatos();
  const { notify } = useToast();
  const lote = datos.lotes.find((l) => l.id === loteId)!;
  const eco = economia(datos, lote);
  const [edit, setEdit] = useState<{ costo: string; precio: string } | null>(null);

  return (
    <Card className="lg:col-span-7">
      <CardTitle
        icon={<Calculator className="size-4" />}
        title={`Balance económico · ${loteId}`}
        hint="RF05 · RF12 · fórmulas y supuestos visibles."
        action={
          !edit && (
            <Button variant="secundario" onClick={() => setEdit({ costo: String(lote.costoTotalCop), precio: String(lote.precioVentaKgCop) })}>
              Editar supuestos
            </Button>
          )
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-[0.68rem] text-ink-soft">Costo unitario</p>
          <p className="mt-1 text-xl font-semibold">{cop.format(eco.costoUnitario)}<span className="text-xs font-normal text-ink-soft">/kg</span></p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-[0.68rem] text-ink-soft">Margen estimado</p>
          <p className={cn("mt-1 text-xl font-semibold", eco.margen >= 15 ? "text-bosque-300" : "text-ambar")}>{eco.margen}%</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-[0.68rem] text-ink-soft">Ingreso potencial</p>
          <p className="mt-1 text-xl font-semibold">{cop.format(eco.ingreso)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 rounded-2xl border border-line p-4 font-mono text-[0.7rem] leading-relaxed text-ink-soft sm:grid-cols-2">
        <p>
          costo unitario = costo total / kg producidos
          <br />= {cop.format(lote.costoTotalCop)} / {eco.kgBase} kg = <span className="text-ink">{cop.format(eco.costoUnitario)}</span>
        </p>
        <p>
          margen = (precio − costo) / precio
          <br />= ({cop.format(lote.precioVentaKgCop)} − {cop.format(eco.costoUnitario)}) / {cop.format(lote.precioVentaKgCop)} = <span className="text-ink">{eco.margen}%</span>
        </p>
        <p className="sm:col-span-2">Supuestos: el costo total incluye compra, beneficio y mano de obra; sin kg producidos se usa lo recibido (nunca se divide entre cero).</p>
      </div>
      <AnimatePresence>
        {edit && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              const r = actualizarEconomia(loteId, Number(edit.costo), Number(edit.precio), actor);
              notify(r.ok ? "exito" : "error", r.ok ? r.mensaje : r.error);
              if (r.ok) setEdit(null);
            }}
          >
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <Field label="Costo total (COP)">
                <Input type="number" value={edit.costo} onChange={(e) => setEdit({ ...edit, costo: e.target.value })} />
              </Field>
              <Field label="Precio de venta (COP/kg)">
                <Input type="number" value={edit.precio} onChange={(e) => setEdit({ ...edit, precio: e.target.value })} />
              </Field>
              <Button type="submit" className="py-3">Guardar</Button>
              <Button type="button" variant="fantasma" className="py-3" onClick={() => setEdit(null)}>Cancelar</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}

function LotesCard({ onAccion, onSelect }: { onAccion: (d: Dialogo) => void; onSelect: (id: string) => void }) {
  const datos = useDatos();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const filas = datos.lotes.filter(
    (l) =>
      (origen === "todos" || l.origen === origen) &&
      (estado === "todos" || l.estado === estado) &&
      `${l.id} ${l.productor} ${l.producto}`.toLowerCase().includes(q.toLowerCase()),
  );

  const descargar = () => {
    const blob = new Blob([exportarCsv({ ...datos, lotes: filas })], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orivia-lotes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("exito", "CSV exportado", `${filas.length} lote(s) con orígenes, cantidades, estados y costos.`);
  };

  return (
    <Card>
      <CardTitle
        icon={<ShieldCheck className="size-4" />}
        title="Lotes, estados y costos"
        hint="RF09 · RF11 · filtros y exportación CSV."
        action={
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar lote" className="w-32 py-2 pl-8 text-xs" />
            </label>
            <Select value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Filtrar por origen" className="w-auto py-2 text-xs">
              <option value="todos">Origen: todos</option>
              {ORIGENES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
            <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado" className="w-auto py-2 text-xs">
              <option value="todos">Estado: todos</option>
              <option>PENDIENTE</option>
              <option>LIBERADO</option>
              <option>BLOQUEADO</option>
            </Select>
            <Button onClick={descargar}>
              <Download className="size-3.5" /> Exportar CSV
            </Button>
          </div>
        }
      />
      <Table head={["Lote", "Producto", "Origen", "Disponible", "Merma", "Costo unit.", "Margen", "Estado", "Acciones"]} empty={filas.length === 0}>
        {filas.map((l) => {
          const inv = inventario(datos, l.id);
          const eco = economia(datos, l);
          const m = mermaLote(datos, l.id);
          return (
            <tr key={l.id} className="cursor-pointer transition hover:bg-surface-2/60" onClick={() => onSelect(l.id)}>
              <Td className="font-mono font-semibold">{l.id}</Td>
              <Td>{l.producto}</Td>
              <Td>{l.origen}</Td>
              <Td>{inv.disponible} kg</Td>
              <Td>
                <span className={cn("font-semibold", m > MERMA_UMBRAL ? "text-ambar" : "text-ink")}>{m}%</span>
              </Td>
              <Td>{cop.format(eco.costoUnitario)}</Td>
              <Td>{eco.margen}%</Td>
              <Td>
                <EstadoBadge estado={l.estado} />
              </Td>
              <Td>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {l.estado !== "LIBERADO" && (
                    <button onClick={() => onAccion({ tipo: "liberar", lote: l })} className="rounded-full p-1.5 text-bosque-300 hover:bg-bosque-500/15" aria-label={`Liberar ${l.id}`} title="Liberar">
                      <Unlock className="size-4" />
                    </button>
                  )}
                  {l.estado !== "BLOQUEADO" && (
                    <button onClick={() => onAccion({ tipo: "bloquear", lote: l })} className="rounded-full p-1.5 text-[#f08a8c] hover:bg-cereza/15" aria-label={`Bloquear ${l.id}`} title="Bloquear">
                      <Lock className="size-4" />
                    </button>
                  )}
                  <Link href={`/ficha/${l.id}`} className="rounded-full p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={`Ficha pública de ${l.id}`} title="Ficha pública">
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

function AuditoriaCard() {
  const datos = useDatos();
  const [lote, setLote] = useState("todos");
  const filas = [...datos.auditoria].reverse().filter((a) => lote === "todos" || a.entidad === lote);
  return (
    <Card>
      <CardTitle
        icon={<ScrollText className="size-4" />}
        title="Auditoría"
        hint="RF10 · quién, cuándo y qué cambió. Los eventos nunca se eliminan."
        action={
          <Select value={lote} onChange={(e) => setLote(e.target.value)} aria-label="Filtrar auditoría por lote" className="w-auto py-2 text-xs">
            <option value="todos">Todas las entidades</option>
            {datos.lotes.map((l) => (
              <option key={l.id}>{l.id}</option>
            ))}
          </Select>
        }
      />
      <div className="max-h-[420px] overflow-y-auto">
        <Table head={["Cuándo", "Quién", "Acción", "Entidad", "Valor anterior", "Valor nuevo", "Motivo"]} empty={filas.length === 0}>
          {filas.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap text-ink-soft">{fmtFechaHora(a.cuando)}</Td>
              <Td className="font-mono text-[0.68rem]">{a.quien}</Td>
              <Td className="font-semibold">{a.accion}</Td>
              <Td className="font-mono">{a.entidad}</Td>
              <Td className="text-ink-soft">{a.anterior ?? "—"}</Td>
              <Td>{a.nuevo ?? "—"}</Td>
              <Td className="max-w-56 text-ink-soft">{a.motivo ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </Card>
  );
}

function ConfirmDialog({ dialogo, onClose, onConfirm }: { dialogo: NonNullable<Dialogo>; onClose: () => void; onConfirm: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState(
    dialogo.tipo === "bloquear" ? `Merma superior al umbral del ${MERMA_UMBRAL}% detectada en la incidencia de la hora 12.` : "",
  );
  const titulo =
    dialogo.tipo === "reset" ? "¿Restablecer los datos de demostración?" : dialogo.tipo === "bloquear" ? `Bloquear ${dialogo.lote.id}` : `Liberar ${dialogo.lote.id}`;
  const texto =
    dialogo.tipo === "reset"
      ? "Se reemplazan lotes, transformaciones y auditoría locales por los datos iniciales. Úsalo solo para repetir la demostración."
      : dialogo.tipo === "bloquear"
        ? "El lote pasará a BLOQUEADO, no admitirá transformaciones ni pedidos y la ficha pública lo mostrará como no disponible."
        : "El lote pasará a LIBERADO y podrá usarse en pedidos.";

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="relative w-full max-w-md rounded-t-[1.75rem] border border-line bg-card p-6 shadow-2xl sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {dialogo.tipo === "bloquear" ? <AlertTriangle className="size-5 text-[#f08a8c]" /> : dialogo.tipo === "liberar" ? <CheckCircle2 className="size-5 text-bosque-300" /> : <RotateCcw className="size-5 text-ambar" />}
            <h2 id="confirm-title" className="text-base font-semibold">{titulo}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-ink-soft hover:bg-surface-2">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">{texto}</p>
        {dialogo.tipo !== "reset" && (
          <Field label={dialogo.tipo === "bloquear" ? "Motivo (obligatorio)" : "Motivo (opcional)"} className="mt-4">
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
          </Field>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="fantasma" onClick={onClose}>Cancelar</Button>
          <Button variant={dialogo.tipo === "liberar" ? "primario" : "peligro"} onClick={() => onConfirm(motivo)}>
            {dialogo.tipo === "bloquear" ? <Lock className="size-3.5" /> : dialogo.tipo === "liberar" ? <Unlock className="size-3.5" /> : <RotateCcw className="size-3.5" />}
            Confirmar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
