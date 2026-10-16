"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  ExternalLink,
  FlaskConical,
  Handshake,
  Megaphone,
  Network,
  PauseCircle,
  PlayCircle,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { Button, Card, CardTitle, Field, Input, Kpi, Select, Textarea } from "../ui";
import { ActorSheet, ConnectDialog, type Rol } from "./ActorSheet";
import { EcosystemMap } from "./EcosystemMap";
import { TrustBadge } from "./TrustPanel";
import { AdminNetwork } from "./AdminNetwork";
import { useSession } from "@/components/auth/roles";
import { useToast } from "@/components/ui/Toaster";
import { useDatos } from "@/lib/store";
import { rutaFicha } from "@/lib/enlaces";
import {
  ASOCIACION_ID,
  CATEGORIA_NECESIDAD,
  CATEGORIA_OFERTA,
  ESTADO_NECESIDAD,
  TIPO_ACTOR,
  actorExplorable,
  actorPorId,
  cambiarEstadoNecesidad,
  coincidencias,
  indicadores,
  lotesNoOfertables,
  publicarNecesidad,
  todasLasOfertas,
  useCluster,
  type CategoriaNecesidad,
  type Coincidencia,
  type TipoActor,
  type Visibilidad,
} from "@/lib/cluster";
import { cn } from "@/lib/cn";

const CICLO = [
  { t: "Descubrir", d: "Actores, ofertas y necesidades publicadas." },
  { t: "Revisar ficha", d: "Capacidades, lotes y confianza explicada." },
  { t: "Solicitar conexión", d: "El administrador envía la solicitud." },
  { t: "Aceptación humana", d: "La contraparte acepta o rechaza." },
  { t: "Compartir lo autorizado", d: "Contacto y condiciones, nada más." },
];

/** Vista "Red del clúster" para los paneles internos (operador y administrador). */
export function ClusterView({ rol }: { rol: Rol }) {
  const cluster = useCluster();
  const datos = useDatos();
  const [actorId, setActorId] = useState<string | null>(null);
  const k = indicadores(cluster, datos);

  return (
    <div className="space-y-6">
      {/* Propuesta y ciclo de relación */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-br from-bosque to-bosque-900 p-6 text-crema sm:p-8">
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(201,138,43,0.35),transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-[#f3c77e] uppercase">Red del clúster cacaotero del Huila</p>
            <h2 className="mt-2 text-xl leading-snug font-semibold sm:text-2xl">
              ORIVIA conecta a quienes producen, transforman y comercializan cacao.
            </h2>
            <p className="mt-2 text-sm text-crema/75">
              {rol === "operador"
                ? "Explora aliados, publica las necesidades de la asociación y revisa qué ofertas coinciden con ellas."
                : "Gestiona la red: responde solicitudes de conexión, modera actores y registra las evidencias que sustentan la confianza."}
            </p>
          </div>
          <span className="rounded-full border border-crema/25 bg-crema/10 px-3 py-1 text-[0.62rem] font-semibold tracking-wider">
            DATOS SINTÉTICOS · DEMO
          </span>
        </div>
        <ol className="relative mt-6 grid gap-2 sm:grid-cols-5">
          {CICLO.map((c, i) => (
            <motion.li
              key={c.t}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-crema/15 bg-crema/[0.06] p-3"
            >
              <p className="flex items-center gap-2 text-xs font-semibold">
                <span className="grid size-5 place-items-center rounded-full bg-ambar text-[0.6rem] text-carbon">{i + 1}</span>
                {c.t}
              </p>
              <p className="mt-1 text-[0.68rem] leading-relaxed text-crema/65">{c.d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Actores activos" value={String(k.actores)} hint={`${k.tipos} tipos de actor · ${k.porVerificar} en verificación`} />
        <Kpi label="Necesidades abiertas" value={String(k.necesidadesAbiertas)} tone="alerta" hint="Publicadas en la red" />
        <Kpi label="Ofertas publicadas" value={String(k.ofertas)} tone="bien" hint="Incluye lotes liberados" />
        <Kpi label="Conexiones aceptadas" value={String(k.conexionesAceptadas)} hint={`${k.pendientes} pendientes de aceptación`} />
      </div>

      <Card>
        <CardTitle
          icon={<Network className="size-4" />}
          title="Cómo se conecta el ecosistema"
          hint="Cada línea es una solicitud registrada: aceptada, pendiente o rechazada. Selecciona un actor para ver su ficha."
        />
        <EcosystemMap cluster={cluster} onSelect={setActorId} soloExplorables={rol === "operador"} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Explorer rol={rol} onActor={setActorId} />
        <Coincidencias rol={rol} onActor={setActorId} />
      </div>

      <NecesidadesAsociacion rol={rol} />

      {rol === "administrador" && <AdminNetwork onActor={setActorId} />}

      <ActorSheet actorId={actorId} rol={rol} onClose={() => setActorId(null)} />
    </div>
  );
}

type Vista = "actores" | "necesidades" | "ofertas";

function Explorer({ rol, onActor }: { rol: Rol; onActor: (id: string) => void }) {
  const cluster = useCluster();
  const datos = useDatos();
  const [vista, setVista] = useState<Vista>("actores");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | TipoActor>("todos");
  const [municipio, setMunicipio] = useState("todos");
  const [categoria, setCategoria] = useState("todas");

  // El operador explora solo actores activos y no privados; administración ve también los demás.
  const actores = cluster.actores.filter((a) => rol === "administrador" || actorExplorable(a));
  const municipios = [...new Set(actores.map((a) => a.municipio))].sort();
  const visible = (actorId: string) => {
    const a = actorPorId(cluster, actorId);
    return !!a && (rol === "administrador" || actorExplorable(a)) && (tipo === "todos" || a.tipo === tipo) && (municipio === "todos" || a.municipio === municipio);
  };
  const texto = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());

  const listaActores = actores.filter((a) => visible(a.id) && texto(`${a.nombre} ${a.descripcion} ${a.capacidades.join(" ")}`));
  const listaNecesidades = cluster.necesidades.filter(
    (n) => visible(n.actorId) && (categoria === "todas" || n.categoria === categoria) && texto(`${n.titulo} ${n.descripcion}`) && (rol === "administrador" || n.visibilidad !== "PRIVATE"),
  );
  const listaOfertas = todasLasOfertas(cluster, datos).filter(
    (o) => visible(o.actorId) && (categoria === "todas" || o.categoria === categoria) && texto(`${o.titulo} ${o.descripcion}`),
  );
  const bloqueados = lotesNoOfertables(datos);

  const cats = vista === "necesidades" ? CATEGORIA_NECESIDAD : CATEGORIA_OFERTA;

  return (
    <Card>
      <CardTitle icon={<Search className="size-4" />} title="Explorar el clúster" hint="Actores, necesidades y ofertas con su estado. Campos públicos y compartidos según tu rol." />
      <div className="flex flex-wrap gap-1.5 rounded-full bg-surface-2 p-1" role="tablist" aria-label="Qué explorar">
        {(
          [
            ["actores", "Actores", listaActores.length],
            ["necesidades", "Necesidades", listaNecesidades.length],
            ["ofertas", "Ofertas", listaOfertas.length],
          ] as const
        ).map(([v, l, n]) => (
          <button
            key={v}
            role="tab"
            aria-selected={vista === v}
            onClick={() => {
              setVista(v);
              setCategoria("todas");
            }}
            className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition", vista === v ? "bg-bosque text-crema shadow" : "text-ink-soft hover:text-ink")}
          >
            {l} <span className="opacity-70">({n})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, capacidad o producto" aria-label="Buscar en el clúster" className="py-2 pl-8 text-xs" />
        </label>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo de actor" className="py-2 text-xs">
          <option value="todos">Todos los actores</option>
          {(Object.keys(TIPO_ACTOR) as TipoActor[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_ACTOR[t].plural}
            </option>
          ))}
        </Select>
        <Select value={municipio} onChange={(e) => setMunicipio(e.target.value)} aria-label="Municipio" className="py-2 text-xs">
          <option value="todos">Todo el Huila</option>
          {municipios.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        {vista !== "actores" && (
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría" className="py-2 text-xs">
            <option value="todas">Todas las categorías</option>
            {Object.entries(cats).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {vista === "actores" &&
            listaActores.map((a) => (
              <Fila key={a.id} onClick={() => onActor(a.id)}>
                <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: TIPO_ACTOR[a.tipo].color }} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {a.nombre}
                    {a.id === ASOCIACION_ID && <span className="rounded-full bg-bosque px-2 py-0.5 text-[0.58rem] text-crema">TU ASOCIACIÓN</span>}
                    {a.estado !== "ACTIVE" && <span className="rounded-full bg-ambar/15 px-2 py-0.5 text-[0.58rem] text-ambar">{a.estado}</span>}
                  </span>
                  <span className="block text-[0.72rem] text-ink-soft">
                    {TIPO_ACTOR[a.tipo].label} · {a.municipio} · {a.capacidades.slice(0, 2).join(", ")}
                  </span>
                </span>
                <TrustBadge senales={a.senales} />
              </Fila>
            ))}
          {vista === "necesidades" &&
            listaNecesidades.map((n) => (
              <Fila key={n.id} onClick={() => onActor(n.actorId)}>
                <Megaphone className="mt-0.5 size-4 shrink-0 text-ambar" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{n.titulo}</span>
                  <span className="block text-[0.72rem] text-ink-soft">
                    {actorPorId(cluster, n.actorId)?.nombre} · {CATEGORIA_NECESIDAD[n.categoria]} · {n.cantidad} {n.unidad}
                  </span>
                </span>
                <EstadoChip estado={n.estado} />
              </Fila>
            ))}
          {vista === "ofertas" &&
            listaOfertas.map((o) => (
              <Fila key={o.id} onClick={() => onActor(o.actorId)}>
                <Boxes className="mt-0.5 size-4 shrink-0 text-bosque-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{o.titulo}</span>
                  <span className="block text-[0.72rem] text-ink-soft">
                    {actorPorId(cluster, o.actorId)?.nombre} · {CATEGORIA_OFERTA[o.categoria]} · {o.cantidad} {o.unidad}
                  </span>
                </span>
                {o.loteId ? (
                  <Link
                    href={rutaFicha(o.loteId)}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[0.65rem] font-semibold hover:border-bosque-300"
                  >
                    Ficha <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <span className="shrink-0 rounded-full bg-bosque-500/12 px-2 py-0.5 text-[0.6rem] font-bold text-bosque-500">PUBLICADA</span>
                )}
              </Fila>
            ))}
        </AnimatePresence>
        {((vista === "actores" && !listaActores.length) || (vista === "necesidades" && !listaNecesidades.length) || (vista === "ofertas" && !listaOfertas.length)) && (
          <p className="py-8 text-center text-xs text-ink-soft">No hay resultados con estos filtros.</p>
        )}
      </div>

      {vista === "ofertas" && bloqueados.length > 0 && (
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[0.68rem] leading-relaxed text-ink-soft">
          No se ofrecen: {bloqueados.map((b) => `${b.id} (${b.estado.toLowerCase()})`).join(", ")}. Solo los lotes liberados aparecen como oferta disponible.
        </p>
      )}
      <p className="mt-3 text-[0.64rem] text-ink-soft">Fuente: datos sintéticos locales con el contrato de /api/v1/cluster; se reemplazan por la API al integrarla.</p>
    </Card>
  );
}

function Fila({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-bosque-300 hover:shadow-md"
    >
      {children}
    </motion.button>
  );
}

function EstadoChip({ estado }: { estado: keyof typeof ESTADO_NECESIDAD }) {
  const c = { OPEN: "bg-ambar/15 text-ambar", MATCHED: "bg-bosque-500/15 text-bosque-500", PAUSED: "bg-surface-2 text-ink-soft", CLOSED: "bg-surface-2 text-ink-soft" }[estado];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold tracking-wider", c)}>{ESTADO_NECESIDAD[estado].toUpperCase()}</span>;
}

function Coincidencias({ rol, onActor }: { rol: Rol; onActor: (id: string) => void }) {
  const cluster = useCluster();
  const datos = useDatos();
  const { notify } = useToast();
  const lista = useMemo(() => coincidencias(cluster, datos).slice(0, 6), [cluster, datos]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [conectar, setConectar] = useState<Coincidencia | null>(null);
  const asociacion = (m: Coincidencia) => m.necesidad.actorId === ASOCIACION_ID || m.oferta.actorId === ASOCIACION_ID;

  const accion = (m: Coincidencia) => {
    if (rol !== "administrador") {
      notify("info", "Acción del administrador", "La sugerencia queda visible en el panel del administrador, que decide si solicita la conexión.");
      return;
    }
    if (!asociacion(m)) {
      notify("info", "Coincidencia entre terceros", "La asociación solo puede solicitar conexiones propias. Puedes compartir la sugerencia con ambos actores fuera de la plataforma.");
      return;
    }
    setConectar(m);
  };

  const destinoDe = (m: Coincidencia) => (m.necesidad.actorId === ASOCIACION_ID ? m.oferta.actorId : m.necesidad.actorId);

  return (
    <Card>
      <CardTitle
        icon={<Sparkles className="size-4" />}
        title="Coincidencias sugeridas"
        hint="Reglas determinísticas: categoría compatible, cobertura de cantidad y confianza. Son sugerencias; no crean conexiones."
      />
      <ul className="space-y-2">
        {lista.map((m) => {
          const id = `${m.necesidad.id}:${m.oferta.id}`;
          const necesita = actorPorId(cluster, m.necesidad.actorId);
          const ofrece = actorPorId(cluster, m.oferta.actorId);
          return (
            <li key={id} className="rounded-2xl border border-line bg-surface p-3">
              <button className="flex w-full items-center gap-3 text-left" onClick={() => setAbierta(abierta === id ? null : id)} aria-expanded={abierta === id}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bosque text-sm font-bold text-crema">{m.puntaje}</span>
                <span className="min-w-0 flex-1 text-[0.75rem]">
                  <span className="block font-semibold">{m.necesidad.titulo}</span>
                  <span className="flex items-center gap-1 text-ink-soft">
                    <span className="truncate">{necesita?.nombre}</span> <ArrowRight className="size-3 shrink-0" /> <span className="truncate">{ofrece?.nombre}</span>
                  </span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {abierta === id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ul className="mt-3 space-y-1 border-t border-line pt-3">
                      {m.razones.map((r) => (
                        <li key={r} className="text-[0.68rem] text-ink-soft">
                          · {r}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secundario" onClick={() => onActor(ofrece?.id ?? "")}>
                        <Users className="size-3.5" /> Ver oferente
                      </Button>
                      <Button onClick={() => accion(m)}>
                        <Handshake className="size-3.5" /> Solicitar conexión
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
        {!lista.length && <p className="py-6 text-center text-xs text-ink-soft">No hay coincidencias para las necesidades abiertas.</p>}
      </ul>
      {conectar && (
        <ConnectDialog
          key={`${conectar.necesidad.id}:${conectar.oferta.id}`}
          open
          destinoId={destinoDe(conectar)}
          necesidadId={conectar.necesidad.id}
          ofertaId={conectar.oferta.id}
          sugerencia={`Coincidencia: "${conectar.necesidad.titulo}" ↔ "${conectar.oferta.titulo}". ¿Conversamos condiciones?`}
          onClose={() => setConectar(null)}
        />
      )}
    </Card>
  );
}

function NecesidadesAsociacion({ rol }: { rol: Rol }) {
  const cluster = useCluster();
  const session = useSession();
  const { notify } = useToast();
  const actor = { email: session?.email ?? `${rol}@orivia.co`, role: rol };
  const propias = cluster.necesidades.filter((n) => n.actorId === ASOCIACION_ID).slice().reverse();
  const [form, setForm] = useState({ titulo: "", descripcion: "", categoria: "TECHNICAL_ASSISTANCE" as CategoriaNecesidad, cantidad: "", unidad: "", visibilidad: "PUBLIC" as Visibilidad });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = publicarNecesidad({ ...form, cantidad: Number(form.cantidad) }, actor);
    if (!r.ok) {
      setError(r.error);
      notify("error", "Necesidad no publicada", r.error);
      return;
    }
    setError(null);
    notify("exito", "Necesidad publicada", r.mensaje);
    setForm({ ...form, titulo: "", descripcion: "", cantidad: "", unidad: "" });
  };

  const cambiar = (id: string, estado: "OPEN" | "PAUSED" | "CLOSED") => {
    const r = cambiarEstadoNecesidad(id, estado, actor);
    notify(r.ok ? "exito" : "error", r.ok ? r.mensaje : r.error);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <CardTitle icon={<Megaphone className="size-4" />} title="Publicar una necesidad" hint="En nombre de la Asociación Cacao Huila. Se valida y queda en auditoría." />
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Sacos de fique para empaque" />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Qué se necesita, para cuándo y para qué lotes." />
          </Field>
          <Field label="Categoría">
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaNecesidad })}>
              {Object.entries(CATEGORIA_NECESIDAD).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibilidad">
            <Select value={form.visibilidad} onChange={(e) => setForm({ ...form, visibilidad: e.target.value as Visibilidad })}>
              <option value="PUBLIC">Pública (aparece en exploración)</option>
              <option value="SHARED">Compartida (solo actores conectados)</option>
            </Select>
          </Field>
          <Field label="Cantidad">
            <Input type="number" inputMode="decimal" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} placeholder="200" />
          </Field>
          <Field label="Unidad">
            <Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="kg, jornadas, unidades…" />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-cereza/10 px-3.5 py-2.5 text-xs font-medium text-cereza sm:col-span-2">
              {error}
            </p>
          )}
          <Button type="submit" className="py-3 sm:col-span-2">
            <Megaphone className="size-3.5" /> Publicar en la red
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle icon={<FlaskConical className="size-4" />} title="Necesidades de la asociación" hint="Pausa o cierra una necesidad cuando ya no aplique. Una necesidad cerrada no se reabre." />
        <ul className="space-y-2">
          {propias.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{n.titulo}</span>
                <span className="block text-[0.72rem] text-ink-soft">
                  {CATEGORIA_NECESIDAD[n.categoria]} · {n.cantidad} {n.unidad} · {n.visibilidad === "PUBLIC" ? "pública" : "compartida"}
                </span>
              </span>
              <EstadoChip estado={n.estado} />
              {n.estado !== "CLOSED" && (
                <span className="flex gap-1">
                  {n.estado === "PAUSED" ? (
                    <IconBtn label="Reabrir" onClick={() => cambiar(n.id, "OPEN")}>
                      <PlayCircle className="size-4" />
                    </IconBtn>
                  ) : (
                    n.estado === "OPEN" && (
                      <IconBtn label="Pausar" onClick={() => cambiar(n.id, "PAUSED")}>
                        <PauseCircle className="size-4" />
                      </IconBtn>
                    )
                  )}
                  <IconBtn label="Cerrar" onClick={() => cambiar(n.id, "CLOSED")}>
                    <XCircle className="size-4" />
                  </IconBtn>
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink">
      {children}
    </button>
  );
}
