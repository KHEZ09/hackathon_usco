"use client";

// Red del clúster cacaotero (actores, necesidades, ofertas, conexiones y confianza).
// Espejo local del contrato de backend/app/cluster y de las migraciones 005/006: mismos tipos,
// estados, visibilidad y fórmula trust-v1. Datos sintéticos persistidos en localStorage hasta
// conectar /api/v1/cluster.

import { useSyncExternalStore } from "react";
import { getSnapshot as getOperacion, inventario, registrarAuditoria, type Datos } from "./store";

export type TipoActor =
  | "PRODUCER"
  | "ASSOCIATION"
  | "TRANSFORMER"
  | "BUYER"
  | "AGROENTREPRENEUR"
  | "TRANSPORTER"
  | "SERVICE_PROVIDER"
  | "INSTITUTION";
export type EstadoActor = "ACTIVE" | "PENDING" | "SUSPENDED" | "BLOCKED";
export type Visibilidad = "PUBLIC" | "SHARED" | "PRIVATE";
export type CategoriaNecesidad =
  | "RAW_MATERIAL"
  | "INPUTS"
  | "TECHNICAL_ASSISTANCE"
  | "FINANCING"
  | "LOGISTICS"
  | "MARKET"
  | "PROCESSING_CAPACITY"
  | "OTHER";
export type EstadoNecesidad = "OPEN" | "MATCHED" | "PAUSED" | "CLOSED";
export type CategoriaOferta = "CACAO" | "TRANSFORMATION" | "INPUTS" | "LOGISTICS" | "TECHNICAL_ASSISTANCE" | "FINANCING" | "OTHER";
export type EstadoOferta = "PUBLISHED" | "PAUSED" | "CLOSED";
export type EstadoConexion = "REQUESTED" | "ACCEPTED" | "REJECTED" | "CANCELLED";
export type TipoConexion = "NEED_MATCH" | "OFFER_MATCH" | "DIRECT";

export type Senales = {
  perfilCompleto: boolean;
  evidencias: number;
  eventosVerificados: number;
  controlesConsistencia: number;
  incidenciasResueltas: number;
  incidenciasAbiertas: number;
};

export type Actor = {
  id: string;
  nombre: string;
  tipo: TipoActor;
  municipio: string;
  descripcion: string;
  capacidades: string[];
  visibilidad: Visibilidad;
  estado: EstadoActor;
  /** Compartido: solo tras una conexión aceptada. */
  contacto: { email: string; telefono: string };
  /** Privado: solo administración. */
  notasInternas: string;
  senales: Senales;
  lotes?: string[];
};

export type Necesidad = {
  id: string;
  actorId: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaNecesidad;
  cantidad: number;
  unidad: string;
  estado: EstadoNecesidad;
  visibilidad: Visibilidad;
  creada: string;
};

export type Oferta = {
  id: string;
  actorId: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaOferta;
  cantidad: number;
  unidad: string;
  estado: EstadoOferta;
  /** Las ofertas de cacao derivadas de lotes no se guardan: se calculan desde la operación. */
  loteId?: string;
};

export type Conexion = {
  id: string;
  solicitanteId: string;
  destinoId: string;
  tipo: TipoConexion;
  necesidadId?: string;
  ofertaId?: string;
  mensaje: string;
  estado: EstadoConexion;
  creada: string;
  decidida?: string;
  decididaPor?: string;
  motivo?: string;
};

export type EventoSenal = { id: string; actorId: string; tipo: TipoSenal; nota: string; quien: string; cuando: string };
export type TipoSenal = "EVIDENCIA" | "EVENTO_VERIFICADO" | "CONSISTENCIA" | "INCIDENCIA_ABIERTA" | "INCIDENCIA_RESUELTA";

export type Cluster = {
  version: 1;
  actores: Actor[];
  necesidades: Necesidad[];
  ofertas: Oferta[];
  conexiones: Conexion[];
  senales: EventoSenal[];
};

export type ActorSesion = { email: string; role: string };
export type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

/** La asociación que opera ORIVIA: operador y administrador actúan en su nombre. */
export const ASOCIACION_ID = "actor-assoc-001";

export const TIPO_ACTOR: Record<TipoActor, { label: string; plural: string; color: string }> = {
  PRODUCER: { label: "Productor", plural: "Productores", color: "#8fb3a0" },
  ASSOCIATION: { label: "Asociación", plural: "Asociaciones", color: "#d9c9b1" },
  TRANSFORMER: { label: "Transformador", plural: "Transformadores", color: "#b88a6c" },
  BUYER: { label: "Comprador", plural: "Compradores", color: "#c98a2b" },
  AGROENTREPRENEUR: { label: "Agroemprendedor", plural: "Agroemprendedores", color: "#e0576a" },
  TRANSPORTER: { label: "Transportador", plural: "Transportadores", color: "#6fa6c9" },
  SERVICE_PROVIDER: { label: "Proveedor de servicios", plural: "Proveedores", color: "#a58bd0" },
  INSTITUTION: { label: "Institución", plural: "Instituciones", color: "#efe3cf" },
};

export const CATEGORIA_NECESIDAD: Record<CategoriaNecesidad, string> = {
  RAW_MATERIAL: "Materia prima",
  INPUTS: "Insumos",
  TECHNICAL_ASSISTANCE: "Asistencia técnica",
  FINANCING: "Financiación",
  LOGISTICS: "Logística",
  MARKET: "Mercado",
  PROCESSING_CAPACITY: "Capacidad de proceso",
  OTHER: "Otra",
};

export const CATEGORIA_OFERTA: Record<CategoriaOferta, string> = {
  CACAO: "Cacao",
  TRANSFORMATION: "Transformación",
  INPUTS: "Insumos",
  LOGISTICS: "Logística",
  TECHNICAL_ASSISTANCE: "Asistencia técnica",
  FINANCING: "Financiación",
  OTHER: "Otra",
};

export const ESTADO_CONEXION: Record<EstadoConexion, string> = {
  REQUESTED: "Pendiente de aceptación",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export const ESTADO_NECESIDAD: Record<EstadoNecesidad, string> = {
  OPEN: "Abierta",
  MATCHED: "Con aliado",
  PAUSED: "Pausada",
  CLOSED: "Cerrada",
};

export const ESTADO_ACTOR: Record<EstadoActor, string> = {
  ACTIVE: "Activo",
  PENDING: "En verificación",
  SUSPENDED: "Suspendido",
  BLOCKED: "Bloqueado",
};

// ── Confianza explicable (port exacto de backend/app/cluster/trust.py, trust-v1) ──
export const FORMULA_CONFIANZA = "trust-v1";

export function calcularConfianza(s: Senales) {
  const perfil = s.perfilCompleto ? 20 : 0;
  const evidencias = Math.min(s.evidencias, 5) * 4;
  const eventos = Math.min(s.eventosVerificados, 5) * 4;
  const consistencia = Math.min(s.controlesConsistencia, 5) * 5;
  const resolucion = Math.min(s.incidenciasResueltas, 3) * 5;
  const penalizacion = Math.min(s.incidenciasAbiertas * 10, 50);
  const score = Math.max(0, Math.min(100, perfil + evidencias + eventos + consistencia + resolucion - penalizacion));
  const nivel: "ALTA" | "MEDIA" | "BAJA" = score >= 80 ? "ALTA" : score >= 60 ? "MEDIA" : "BAJA";
  const componentes = [
    { label: "Perfil completo", puntos: perfil, max: 20, dato: s.perfilCompleto ? "sí" : "no" },
    { label: "Evidencias verificables", puntos: evidencias, max: 20, dato: `${s.evidencias} registradas` },
    { label: "Eventos de trazabilidad verificados", puntos: eventos, max: 20, dato: `${s.eventosVerificados}` },
    { label: "Controles de consistencia", puntos: consistencia, max: 25, dato: `${s.controlesConsistencia}` },
    { label: "Incidencias resueltas", puntos: resolucion, max: 15, dato: `${s.incidenciasResueltas}` },
  ];
  return {
    score,
    nivel,
    formula: FORMULA_CONFIANZA,
    componentes,
    penalizacion,
    limitaciones: [
      "La puntuación orienta decisiones; no reemplaza verificación humana.",
      "Blockchain solo respalda la integridad posterior del registro, no la verdad del dato inicial.",
      "La confianza depende de los datos disponibles y puede cambiar con nuevos eventos.",
    ],
  };
}

// ── Semilla sintética (alineada con InMemoryClusterRepository y 006_seed_cluster_synthetic) ──
const S = (p: boolean, e: number, v: number, c: number, r: number, o = 0): Senales => ({
  perfilCompleto: p,
  evidencias: e,
  eventosVerificados: v,
  controlesConsistencia: c,
  incidenciasResueltas: r,
  incidenciasAbiertas: o,
});

function seed(): Cluster {
  const actores: Actor[] = [
    { id: ASOCIACION_ID, nombre: "Asociación Cacao Huila", tipo: "ASSOCIATION", municipio: "Garzón", descripcion: "Asociación que agrupa productores de Rivera, Campoalegre y Algeciras y conecta su cacao con compradores.", capacidades: ["Acopio", "Fermentación", "Secado", "Consolidación de oferta"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "hola@cacaohuila.example", telefono: "+57 300 000 0002" }, notasInternas: "Cuenta operadora de ORIVIA (demo).", senales: S(true, 4, 4, 4, 2), lotes: ["CAC001", "CAC002", "CAC003"] },
    { id: "actor-prod-001", nombre: "Finca El Porvenir", tipo: "PRODUCER", municipio: "Pitalito", descripcion: "Productor de cacao con trazabilidad por lote.", capacidades: ["Cacao en baba", "Fermentación en cajón"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "contacto@elporvenir.example", telefono: "+57 300 000 0001" }, notasInternas: "Semilla sintética; reemplazar por perfil verificado.", senales: S(true, 5, 5, 5, 2) },
    { id: "actor-prod-002", nombre: "Productor A · Finca La Esperanza", tipo: "PRODUCER", municipio: "Rivera", descripcion: "Proveedor del lote CAC001.", capacidades: ["Cacao seco"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "productor.a@esperanza.example", telefono: "+57 300 000 0011" }, notasInternas: "Lote CAC001 con merma alta en revisión.", senales: S(true, 2, 3, 2, 0, 1), lotes: ["CAC001"] },
    { id: "actor-prod-003", nombre: "Productor B · Finca El Mirador", tipo: "PRODUCER", municipio: "Campoalegre", descripcion: "Proveedor del lote CAC002.", capacidades: ["Cacao seco", "Secado en marquesina"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "productor.b@mirador.example", telefono: "+57 300 000 0012" }, notasInternas: "Proveedor estable.", senales: S(true, 4, 4, 5, 1), lotes: ["CAC002"] },
    { id: "actor-prod-004", nombre: "Productor C · Finca Alto Bonito", tipo: "PRODUCER", municipio: "Algeciras", descripcion: "Proveedor del lote CAC003.", capacidades: ["Cacao fino de aroma"], visibilidad: "SHARED", estado: "ACTIVE", contacto: { email: "productor.c@altobonito.example", telefono: "+57 300 000 0013" }, notasInternas: "Prefiere no publicar su perfil completo.", senales: S(false, 2, 2, 3, 0), lotes: ["CAC003"] },
    { id: "actor-buy-001", nombre: "Transformadora Andina", tipo: "BUYER", municipio: "Neiva", descripcion: "Comprador y transformador de cacao regional.", capacidades: ["Compra de cacao seco", "Pago a 30 días"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "compras@andina.example", telefono: "+57 300 000 0003" }, notasInternas: "Perfil de compras (semilla).", senales: S(true, 3, 4, 5, 1) },
    { id: "actor-trans-001", nombre: "Chocolatería Tierra Opita", tipo: "TRANSFORMER", municipio: "Neiva", descripcion: "Taller de chocolate de origen que busca cacao fino de aroma.", capacidades: ["Tostión", "Conchado", "Barras de origen"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "taller@tierraopita.example", telefono: "+57 300 000 0021" }, notasInternas: "Interesada en lotes pequeños.", senales: S(true, 3, 2, 3, 0) },
    { id: "actor-agro-001", nombre: "Nibs del Sur", tipo: "AGROENTREPRENEUR", municipio: "La Plata", descripcion: "Emprendimiento de nibs y snacks de cacao.", capacidades: ["Descascarillado", "Empaque"], visibilidad: "PUBLIC", estado: "PENDING", contacto: { email: "hola@nibsdelsur.example", telefono: "+57 300 000 0031" }, notasInternas: "Registro nuevo: falta verificar documentos.", senales: S(false, 0, 0, 1, 0) },
    { id: "actor-log-001", nombre: "Transportes Magdalena", tipo: "TRANSPORTER", municipio: "Garzón", descripcion: "Carga agrícola entre municipios del Huila.", capacidades: ["Ruta Garzón–Neiva", "Carga seca hasta 2 t"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "despachos@magdalena.example", telefono: "+57 300 000 0041" }, notasInternas: "Tarifa preferencial negociada (privado).", senales: S(true, 3, 3, 4, 1) },
    { id: "actor-serv-001", nombre: "Laboratorio Sensorial del Huila", tipo: "SERVICE_PROVIDER", municipio: "Neiva", descripcion: "Análisis de humedad, prueba de corte y catación.", capacidades: ["Prueba de corte", "Humedad", "Catación"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "muestras@labsensorial.example", telefono: "+57 300 000 0051" }, notasInternas: "Convenio en revisión.", senales: S(true, 5, 3, 5, 0) },
    { id: "actor-inst-001", nombre: "Centro de Innovación Cacaotera", tipo: "INSTITUTION", municipio: "Neiva", descripcion: "Entidad facilitadora del ecosistema: formación y cofinanciación.", capacidades: ["Formación", "Cofinanciación de secadores"], visibilidad: "PUBLIC", estado: "ACTIVE", contacto: { email: "ecosistema@innovacacao.example", telefono: "+57 300 000 0061" }, notasInternas: "Convocatoria abierta hasta noviembre (demo).", senales: S(true, 4, 1, 3, 0) },
  ];
  const ahora = "2026-10-16T13:00:00.000Z";
  const necesidades: Necesidad[] = [
    { id: "need-001", actorId: "actor-prod-001", titulo: "Secado solar modular", descripcion: "Necesitamos capacidad de secado para la próxima cosecha.", categoria: "PROCESSING_CAPACITY", cantidad: 1, unidad: "módulo", estado: "OPEN", visibilidad: "PUBLIC", creada: ahora },
    { id: "need-002", actorId: "actor-buy-001", titulo: "Cacao fermentado trazable", descripcion: "Buscamos lotes con evidencia completa de origen.", categoria: "RAW_MATERIAL", cantidad: 500, unidad: "kg", estado: "OPEN", visibilidad: "PUBLIC", creada: ahora },
    { id: "need-003", actorId: ASOCIACION_ID, titulo: "Transporte de cacao seco a Neiva", descripcion: "Despacho quincenal de lotes liberados hacia compradores.", categoria: "LOGISTICS", cantidad: 300, unidad: "kg", estado: "MATCHED", visibilidad: "PUBLIC", creada: ahora },
    { id: "need-004", actorId: "actor-trans-001", titulo: "Cacao fino de aroma", descripcion: "Lotes pequeños con perfil floral para barras de origen.", categoria: "RAW_MATERIAL", cantidad: 120, unidad: "kg", estado: "OPEN", visibilidad: "PUBLIC", creada: ahora },
    { id: "need-005", actorId: "actor-prod-004", titulo: "Asistencia técnica en fermentación", descripcion: "Mejorar la consistencia de la fermentación en cajones.", categoria: "TECHNICAL_ASSISTANCE", cantidad: 2, unidad: "jornadas", estado: "OPEN", visibilidad: "SHARED", creada: ahora },
    { id: "need-006", actorId: ASOCIACION_ID, titulo: "Análisis sensorial de lotes", descripcion: "Prueba de corte y catación antes de liberar lotes.", categoria: "TECHNICAL_ASSISTANCE", cantidad: 3, unidad: "análisis", estado: "OPEN", visibilidad: "PUBLIC", creada: ahora },
  ];
  const ofertas: Oferta[] = [
    { id: "offer-001", actorId: ASOCIACION_ID, titulo: "Acompañamiento de fermentación", descripcion: "Asistencia técnica para mejorar la consistencia del proceso.", categoria: "TECHNICAL_ASSISTANCE", cantidad: 3, unidad: "jornadas", estado: "PUBLISHED" },
    { id: "offer-002", actorId: "actor-log-001", titulo: "Ruta semanal Garzón–Neiva", descripcion: "Carga seca con trazabilidad de entrega.", categoria: "LOGISTICS", cantidad: 2000, unidad: "kg", estado: "PUBLISHED" },
    { id: "offer-003", actorId: "actor-serv-001", titulo: "Catación y análisis de humedad", descripcion: "Resultados en 48 horas con informe por lote.", categoria: "TECHNICAL_ASSISTANCE", cantidad: 10, unidad: "análisis", estado: "PUBLISHED" },
    { id: "offer-004", actorId: "actor-prod-001", titulo: "Cacao en baba", descripcion: "Disponible para fermentación centralizada.", categoria: "CACAO", cantidad: 300, unidad: "kg", estado: "PUBLISHED" },
    { id: "offer-005", actorId: "actor-inst-001", titulo: "Cofinanciación de secadores", descripcion: "Convocatoria para infraestructura de poscosecha.", categoria: "FINANCING", cantidad: 1, unidad: "convocatoria", estado: "PUBLISHED" },
  ];
  const conexiones: Conexion[] = [
    { id: "con-001", solicitanteId: "actor-buy-001", destinoId: ASOCIACION_ID, tipo: "OFFER_MATCH", ofertaId: "lote-CAC002", mensaje: "Nos interesa el lote CAC002 para nuestra línea premium. ¿Podemos conversar condiciones?", estado: "REQUESTED", creada: "2026-10-16T09:20:00.000Z" },
    { id: "con-002", solicitanteId: ASOCIACION_ID, destinoId: "actor-log-001", tipo: "NEED_MATCH", necesidadId: "need-003", ofertaId: "offer-002", mensaje: "Queremos programar despachos quincenales a Neiva.", estado: "ACCEPTED", creada: "2026-10-14T15:00:00.000Z", decidida: "2026-10-15T08:10:00.000Z", decididaPor: "Transportes Magdalena" },
    { id: "con-003", solicitanteId: "actor-trans-001", destinoId: ASOCIACION_ID, tipo: "DIRECT", mensaje: "Queremos conocer su oferta de cacao fino de aroma de Algeciras.", estado: "REQUESTED", creada: "2026-10-16T11:45:00.000Z" },
    { id: "con-004", solicitanteId: ASOCIACION_ID, destinoId: "actor-serv-001", tipo: "NEED_MATCH", necesidadId: "need-006", ofertaId: "offer-003", mensaje: "Solicitamos análisis sensorial para tres lotes antes de liberarlos.", estado: "REQUESTED", creada: "2026-10-16T10:05:00.000Z" },
  ];
  return { version: 1, actores, necesidades, ofertas, conexiones, senales: [] };
}

// ── Store externo ─────────────────────────────────────────────────────────
const KEY = "orivia.cluster.v1";
const SERVER_SNAPSHOT = seed();
const listeners = new Set<() => void>();
let cache: Cluster | null = null;

function load(): Cluster {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Cluster;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // sin almacenamiento: semilla
  }
  return seed();
}

export function getCluster() {
  if (!cache) cache = load();
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = load();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: Cluster) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sin persistencia
  }
  listeners.forEach((l) => l());
}

export function useCluster() {
  return useSyncExternalStore(subscribe, getCluster, () => SERVER_SNAPSHOT);
}

export function restablecerCluster() {
  commit(seed());
}

// ── Consultas ─────────────────────────────────────────────────────────────
export const actorPorId = (c: Cluster, id: string) => c.actores.find((a) => a.id === id);

/** Visible en exploración interna del operador: activo y no privado. */
export function actorExplorable(a: Actor) {
  return a.estado === "ACTIVE" && a.visibilidad !== "PRIVATE";
}

/** Ofertas de cacao derivadas de la operación: solo lotes LIBERADO con producto disponible. */
export function ofertasDeLotes(d: Datos): Oferta[] {
  return d.lotes
    .filter((l) => l.estado === "LIBERADO")
    .map((l) => ({ l, inv: inventario(d, l.id) }))
    .filter(({ inv }) => inv.producido > 0)
    .map(({ l, inv }) => ({
      id: `lote-${l.id}`,
      actorId: ASOCIACION_ID,
      titulo: `${l.producto} · lote ${l.id}`,
      descripcion: `${l.finca}, ${l.origen}. Ficha pública con trazabilidad verificable.`,
      categoria: "CACAO" as const,
      cantidad: inv.producido,
      unidad: "kg",
      estado: "PUBLISHED" as const,
      loteId: l.id,
    }));
}

/** Lotes que NO pueden ofrecerse (pendientes o bloqueados), para explicarlo en la interfaz. */
export function lotesNoOfertables(d: Datos) {
  return d.lotes.filter((l) => l.estado !== "LIBERADO").map((l) => ({ id: l.id, estado: l.estado }));
}

export function todasLasOfertas(c: Cluster, d: Datos) {
  return [...ofertasDeLotes(d), ...c.ofertas];
}

/** Contacto compartido solo con conexión aceptada entre la asociación y el actor. */
export function contactoVisible(c: Cluster, actorId: string, rol: string) {
  if (rol === "administrador" || actorId === ASOCIACION_ID) return true;
  return c.conexiones.some(
    (x) =>
      x.estado === "ACCEPTED" &&
      ((x.solicitanteId === ASOCIACION_ID && x.destinoId === actorId) || (x.destinoId === ASOCIACION_ID && x.solicitanteId === actorId)),
  );
}

const COMPATIBLE: Record<CategoriaNecesidad, CategoriaOferta[]> = {
  RAW_MATERIAL: ["CACAO"],
  MARKET: ["CACAO"],
  INPUTS: ["INPUTS"],
  TECHNICAL_ASSISTANCE: ["TECHNICAL_ASSISTANCE"],
  FINANCING: ["FINANCING"],
  LOGISTICS: ["LOGISTICS"],
  PROCESSING_CAPACITY: ["TRANSFORMATION", "FINANCING", "TECHNICAL_ASSISTANCE"],
  OTHER: ["OTHER"],
};

export type Coincidencia = { necesidad: Necesidad; oferta: Oferta; puntaje: number; razones: string[] };

/**
 * Coincidencias sugeridas por reglas determinísticas (categoría compatible, cobertura de cantidad
 * y confianza explicable). Son sugerencias: no crean conexiones por sí solas.
 */
export function coincidencias(c: Cluster, d: Datos): Coincidencia[] {
  const ofertas = todasLasOfertas(c, d).filter((o) => o.estado === "PUBLISHED");
  const out: Coincidencia[] = [];
  for (const n of c.necesidades.filter((x) => x.estado === "OPEN")) {
    const dueno = actorPorId(c, n.actorId);
    if (!dueno || !actorExplorable(dueno)) continue;
    for (const o of ofertas) {
      if (o.actorId === n.actorId || !COMPATIBLE[n.categoria].includes(o.categoria)) continue;
      const oferente = actorPorId(c, o.actorId);
      if (!oferente || !actorExplorable(oferente)) continue;
      const mismaUnidad = o.unidad === n.unidad;
      const cobertura = mismaUnidad ? Math.min(o.cantidad / n.cantidad, 1) : 0.5;
      const conf = calcularConfianza(oferente.senales);
      const puntaje = Math.round(50 + cobertura * 30 + conf.score * 0.2);
      out.push({
        necesidad: n,
        oferta: o,
        puntaje,
        razones: [
          `Categoría compatible: ${CATEGORIA_NECESIDAD[n.categoria]} ↔ ${CATEGORIA_OFERTA[o.categoria]} (+50).`,
          mismaUnidad
            ? `Cubre ${Math.round(cobertura * 100)}% de lo requerido (${o.cantidad} de ${n.cantidad} ${n.unidad}) (+${Math.round(cobertura * 30)}).`
            : `Unidades distintas (${o.unidad} / ${n.unidad}): cobertura por confirmar (+15).`,
          `Confianza ${conf.nivel.toLowerCase()} del oferente: ${conf.score}/100 (+${Math.round(conf.score * 0.2)}).`,
        ],
      });
    }
  }
  return out.sort((a, b) => b.puntaje - a.puntaje);
}

export function indicadores(c: Cluster, d: Datos) {
  const activos = c.actores.filter((a) => a.estado === "ACTIVE");
  return {
    actores: activos.length,
    tipos: new Set(activos.map((a) => a.tipo)).size,
    necesidadesAbiertas: c.necesidades.filter((n) => n.estado === "OPEN").length,
    ofertas: todasLasOfertas(c, d).filter((o) => o.estado === "PUBLISHED").length,
    conexionesAceptadas: c.conexiones.filter((x) => x.estado === "ACCEPTED").length,
    pendientes: c.conexiones.filter((x) => x.estado === "REQUESTED").length,
    porVerificar: c.actores.filter((a) => a.estado === "PENDING").length,
  };
}

// ── Acciones (validan rol, reglas y dejan auditoría) ──────────────────────
const ahoraIso = () => new Date().toISOString();
const nextId = (prefix: string, n: number) => `${prefix}-${String(n + 1).padStart(3, "0")}`;
const soloAdmin = (actor: ActorSesion): Resultado | null =>
  actor.role === "administrador" ? null : { ok: false, error: "Acceso denegado: esta acción de la red es exclusiva del Administrador." };
const esInterno = (actor: ActorSesion) => actor.role === "administrador" || actor.role === "operador";

export function publicarNecesidad(
  input: { titulo: string; descripcion: string; categoria: CategoriaNecesidad; cantidad: number; unidad: string; visibilidad: Visibilidad },
  actor: ActorSesion,
): Resultado {
  if (!esInterno(actor)) return { ok: false, error: "Solo operador o administrador publican necesidades de la asociación." };
  const c = getCluster();
  if (!input.titulo.trim() || !input.descripcion.trim() || !input.categoria || !input.unidad.trim())
    return { ok: false, error: "Completa título, descripción, categoría y unidad." };
  if (!Number.isFinite(input.cantidad) || input.cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor que 0." };
  if (input.visibilidad === "PRIVATE") return { ok: false, error: "Una necesidad privada no puede publicarse en la red." };
  const n: Necesidad = {
    id: nextId("need", c.necesidades.length),
    actorId: ASOCIACION_ID,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion.trim(),
    categoria: input.categoria,
    cantidad: Math.round(input.cantidad * 1000) / 1000,
    unidad: input.unidad.trim(),
    estado: "OPEN",
    visibilidad: input.visibilidad,
    creada: ahoraIso(),
  };
  commit({ ...c, necesidades: [...c.necesidades, n] });
  registrarAuditoria({ quien: actor.email, accion: "Necesidad publicada", entidad: n.id, anterior: null, nuevo: `${n.titulo} · ${n.cantidad} ${n.unidad}` });
  return { ok: true, mensaje: `Necesidad "${n.titulo}" publicada en la red (${n.visibilidad === "PUBLIC" ? "pública" : "compartida"}).` };
}

export function cambiarEstadoNecesidad(id: string, estado: EstadoNecesidad, actor: ActorSesion): Resultado {
  const c = getCluster();
  const n = c.necesidades.find((x) => x.id === id);
  if (!n) return { ok: false, error: "Necesidad no encontrada." };
  if (actor.role === "operador" && n.actorId !== ASOCIACION_ID) return { ok: false, error: "El operador solo gestiona necesidades de su asociación." };
  if (!esInterno(actor)) return { ok: false, error: "Acceso denegado." };
  if (n.estado === estado) return { ok: false, error: `La necesidad ya está ${ESTADO_NECESIDAD[estado].toLowerCase()}.` };
  if (n.estado === "CLOSED") return { ok: false, error: "Una necesidad cerrada no puede reabrirse; publica una nueva." };
  commit({ ...c, necesidades: c.necesidades.map((x) => (x.id === id ? { ...x, estado } : x)) });
  registrarAuditoria({ quien: actor.email, accion: "Estado de necesidad", entidad: id, anterior: n.estado, nuevo: estado });
  return { ok: true, mensaje: `"${n.titulo}": ${ESTADO_NECESIDAD[n.estado]} → ${ESTADO_NECESIDAD[estado]}.` };
}

export function solicitarConexion(
  input: { destinoId: string; necesidadId?: string; ofertaId?: string; mensaje: string },
  actor: ActorSesion,
): Resultado {
  const denegado = soloAdmin(actor);
  if (denegado) return denegado;
  const c = getCluster();
  const destino = actorPorId(c, input.destinoId);
  if (!destino) return { ok: false, error: "Actor no encontrado." };
  if (destino.id === ASOCIACION_ID) return { ok: false, error: "La asociación no puede conectarse consigo misma." };
  if (!actorExplorable(destino)) return { ok: false, error: `${destino.nombre} no está activo o no es visible en la red.` };
  if (!input.mensaje.trim()) return { ok: false, error: "Escribe un mensaje que explique el motivo de la conexión." };
  const duplicada = c.conexiones.some(
    (x) =>
      x.estado === "REQUESTED" &&
      x.solicitanteId === ASOCIACION_ID &&
      x.destinoId === input.destinoId &&
      (x.necesidadId ?? null) === (input.necesidadId ?? null) &&
      (x.ofertaId ?? null) === (input.ofertaId ?? null),
  );
  if (duplicada) return { ok: false, error: "Ya existe una solicitud pendiente con este actor para el mismo motivo." };
  const x: Conexion = {
    id: nextId("con", c.conexiones.length),
    solicitanteId: ASOCIACION_ID,
    destinoId: input.destinoId,
    tipo: input.necesidadId ? "NEED_MATCH" : input.ofertaId ? "OFFER_MATCH" : "DIRECT",
    necesidadId: input.necesidadId,
    ofertaId: input.ofertaId,
    mensaje: input.mensaje.trim(),
    estado: "REQUESTED",
    creada: ahoraIso(),
  };
  commit({ ...c, conexiones: [...c.conexiones, x] });
  registrarAuditoria({ quien: actor.email, accion: "Conexión solicitada", entidad: x.id, anterior: null, nuevo: `${destino.nombre} · REQUESTED` });
  return { ok: true, mensaje: `Solicitud enviada a ${destino.nombre}. Queda pendiente hasta que la contraparte la acepte.` };
}

function decidir(c: Cluster, x: Conexion, estado: EstadoConexion, quien: string, motivo?: string): Cluster {
  const conexiones = c.conexiones.map((y) => (y.id === x.id ? { ...y, estado, decidida: ahoraIso(), decididaPor: quien, motivo: motivo || undefined } : y));
  const necesidades =
    estado === "ACCEPTED" && x.necesidadId
      ? c.necesidades.map((n) => (n.id === x.necesidadId && n.estado === "OPEN" ? { ...n, estado: "MATCHED" as const } : n))
      : c.necesidades;
  return { ...c, conexiones, necesidades };
}

/** El administrador responde, en nombre de la asociación, una solicitud recibida. */
export function responderConexion(id: string, decision: "ACCEPTED" | "REJECTED", motivo: string, actor: ActorSesion): Resultado {
  const denegado = soloAdmin(actor);
  if (denegado) return denegado;
  const c = getCluster();
  const x = c.conexiones.find((y) => y.id === id);
  if (!x) return { ok: false, error: "Solicitud no encontrada." };
  if (x.destinoId !== ASOCIACION_ID) return { ok: false, error: "Solo la contraparte puede responder esta solicitud." };
  if (x.estado !== "REQUESTED") return { ok: false, error: `La solicitud ya está ${ESTADO_CONEXION[x.estado].toLowerCase()}.` };
  if (decision === "REJECTED" && !motivo.trim()) return { ok: false, error: "Indica el motivo del rechazo." };
  commit(decidir(c, x, decision, actor.email, motivo));
  registrarAuditoria({ quien: actor.email, accion: "Conexión respondida", entidad: id, anterior: "REQUESTED", nuevo: decision, motivo: motivo.trim() || undefined });
  const otro = actorPorId(c, x.solicitanteId)?.nombre ?? x.solicitanteId;
  return {
    ok: true,
    mensaje: decision === "ACCEPTED" ? `Conexión con ${otro} aceptada: ahora ambos ven los datos de contacto autorizados.` : `Solicitud de ${otro} rechazada. No se compartió información.`,
  };
}

/** Demo: simula la respuesta de la contraparte a una solicitud enviada por la asociación. */
export function simularRespuestaContraparte(id: string, decision: "ACCEPTED" | "REJECTED", actor: ActorSesion): Resultado {
  const denegado = soloAdmin(actor);
  if (denegado) return denegado;
  const c = getCluster();
  const x = c.conexiones.find((y) => y.id === id);
  if (!x || x.solicitanteId !== ASOCIACION_ID || x.estado !== "REQUESTED") return { ok: false, error: "Solo aplica a solicitudes enviadas y pendientes." };
  const otro = actorPorId(c, x.destinoId)?.nombre ?? x.destinoId;
  commit(decidir(c, x, decision, `${otro} (simulado)`, decision === "REJECTED" ? "Sin capacidad disponible (simulado)." : undefined));
  registrarAuditoria({ quien: `${otro} (simulado)`, accion: "Conexión respondida", entidad: id, anterior: "REQUESTED", nuevo: decision });
  return { ok: true, mensaje: `Respuesta simulada de ${otro}: ${ESTADO_CONEXION[decision].toLowerCase()}.` };
}

export function cancelarConexion(id: string, actor: ActorSesion): Resultado {
  const denegado = soloAdmin(actor);
  if (denegado) return denegado;
  const c = getCluster();
  const x = c.conexiones.find((y) => y.id === id);
  if (!x || x.solicitanteId !== ASOCIACION_ID || x.estado !== "REQUESTED") return { ok: false, error: "Solo puedes cancelar solicitudes propias pendientes." };
  commit({ ...c, conexiones: c.conexiones.map((y) => (y.id === id ? { ...y, estado: "CANCELLED" as const, decidida: ahoraIso(), decididaPor: actor.email } : y)) });
  registrarAuditoria({ quien: actor.email, accion: "Conexión cancelada", entidad: id, anterior: "REQUESTED", nuevo: "CANCELLED" });
  return { ok: true, mensaje: "Solicitud cancelada." };
}

export function cambiarEstadoActor(id: string, estado: EstadoActor, motivo: string, actor: ActorSesion): Resultado {
  const denegado = soloAdmin(actor);
  if (denegado) return denegado;
  const c = getCluster();
  const a = actorPorId(c, id);
  if (!a) return { ok: false, error: "Actor no encontrado." };
  if (a.id === ASOCIACION_ID) return { ok: false, error: "La asociación operadora no puede suspenderse desde aquí." };
  if (a.estado === estado) return { ok: false, error: `${a.nombre} ya está ${ESTADO_ACTOR[estado].toLowerCase()}.` };
  if ((estado === "SUSPENDED" || estado === "BLOCKED") && !motivo.trim()) return { ok: false, error: "Indica el motivo de la suspensión o bloqueo." };
  // Bloquear o suspender cancela las solicitudes pendientes con ese actor.
  const conexiones = c.conexiones.map((x) =>
    (estado === "SUSPENDED" || estado === "BLOCKED") && x.estado === "REQUESTED" && (x.solicitanteId === id || x.destinoId === id)
      ? { ...x, estado: "CANCELLED" as const, decidida: ahoraIso(), decididaPor: actor.email, motivo: `Actor ${ESTADO_ACTOR[estado].toLowerCase()}` }
      : x,
  );
  commit({ ...c, actores: c.actores.map((x) => (x.id === id ? { ...x, estado } : x)), conexiones });
  registrarAuditoria({ quien: actor.email, accion: "Estado de actor", entidad: a.nombre, anterior: a.estado, nuevo: estado, motivo: motivo.trim() || undefined });
  return { ok: true, mensaje: `${a.nombre}: ${ESTADO_ACTOR[a.estado]} → ${ESTADO_ACTOR[estado]}.` };
}

const SENAL_LABEL: Record<TipoSenal, string> = {
  EVIDENCIA: "Evidencia verificada",
  EVENTO_VERIFICADO: "Evento de trazabilidad verificado",
  CONSISTENCIA: "Control de consistencia",
  INCIDENCIA_ABIERTA: "Incidencia abierta",
  INCIDENCIA_RESUELTA: "Incidencia resuelta",
};
export { SENAL_LABEL };

/** Señales append-only: suman al cálculo trust-v1 y quedan en el historial. */
export function registrarSenal(actorId: string, tipo: TipoSenal, nota: string, actor: ActorSesion): Resultado {
  const denegado = soloAdmin(actor);
  if (denegado) return denegado;
  const c = getCluster();
  const a = actorPorId(c, actorId);
  if (!a) return { ok: false, error: "Actor no encontrado." };
  if (!nota.trim()) return { ok: false, error: "Describe la evidencia o incidencia que respalda la señal." };
  if (tipo === "INCIDENCIA_RESUELTA" && a.senales.incidenciasAbiertas === 0) return { ok: false, error: `${a.nombre} no tiene incidencias abiertas.` };
  const s = { ...a.senales };
  if (tipo === "EVIDENCIA") s.evidencias++;
  if (tipo === "EVENTO_VERIFICADO") s.eventosVerificados++;
  if (tipo === "CONSISTENCIA") s.controlesConsistencia++;
  if (tipo === "INCIDENCIA_ABIERTA") s.incidenciasAbiertas++;
  if (tipo === "INCIDENCIA_RESUELTA") {
    s.incidenciasAbiertas--;
    s.incidenciasResueltas++;
  }
  const antes = calcularConfianza(a.senales).score;
  const despues = calcularConfianza(s).score;
  const ev: EventoSenal = { id: nextId("sig", c.senales.length), actorId, tipo, nota: nota.trim(), quien: actor.email, cuando: ahoraIso() };
  commit({ ...c, actores: c.actores.map((x) => (x.id === actorId ? { ...x, senales: s } : x)), senales: [...c.senales, ev] });
  registrarAuditoria({ quien: actor.email, accion: "Señal de confianza", entidad: a.nombre, anterior: `${antes}/100`, nuevo: `${despues}/100`, motivo: `${SENAL_LABEL[tipo]}: ${nota.trim()}` });
  return { ok: true, mensaje: `${SENAL_LABEL[tipo]} registrada. Confianza de ${a.nombre}: ${antes} → ${despues}/100.` };
}

/** Atajo para componentes: datos operativos actuales (lotes) junto a la red. */
export const operacionActual = () => getOperacion();
