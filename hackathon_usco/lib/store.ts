"use client";

// Estado operativo de demostración (lotes, transformaciones y auditoría) persistido en localStorage (RF07).
// Expuesto como store externo para useSyncExternalStore; se reemplaza por la API del backend.

import { useSyncExternalStore } from "react";
import type { EvidenceStep } from "./evidence";

export type Estado = "PENDIENTE" | "LIBERADO" | "BLOQUEADO";
export type Origen = "Rivera" | "Campoalegre" | "Algeciras";

export type Lote = {
  id: string;
  productor: string;
  origen: Origen;
  finca: string;
  producto: string;
  recibidoKg: number;
  fecha: string;
  estado: Estado;
  costoTotalCop: number;
  precioVentaKgCop: number;
};

export type Transformacion = {
  id: string;
  loteId: string;
  etapa: string;
  entradaKg: number;
  salidaKg: number;
  responsable: string;
  incidencias: string;
  fecha: string;
  idem: string;
  sync: "sincronizado" | "pendiente";
};

export type EventoAuditoria = {
  id: string;
  quien: string;
  cuando: string;
  accion: string;
  entidad: string;
  anterior: string | null;
  nuevo: string | null;
  motivo?: string;
};

export type Datos = {
  version: 1;
  lotes: Lote[];
  transformaciones: Transformacion[];
  auditoria: EventoAuditoria[];
};

export type Actor = { email: string };
export type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

export const ORIGENES: Origen[] = ["Rivera", "Campoalegre", "Algeciras"];
export const FINCAS: Record<Origen, string> = {
  Rivera: "Finca La Esperanza",
  Campoalegre: "Finca El Mirador",
  Algeciras: "Finca Alto Bonito",
};
export const ETAPAS = ["Fermentación", "Secado", "Fermentación y secado", "Tostión", "Descascarillado", "Molienda", "Empaque"];
export const MERMA_UMBRAL = 15;

const SISTEMA = "sistema@orivia.co";
const OPERADOR = "operador@orivia.co";
const ADMIN = "admin@orivia.co";

function seed(): Datos {
  const lotes: Lote[] = [
    { id: "CAC001", productor: "Productor A", origen: "Rivera", finca: FINCAS.Rivera, producto: "Cacao de montaña", recibidoKg: 100, fecha: "2026-10-12T08:10:00.000Z", estado: "PENDIENTE", costoTotalCop: 1_600_000, precioVentaKgCop: 25_000 },
    { id: "CAC002", productor: "Productor B", origen: "Campoalegre", finca: FINCAS.Campoalegre, producto: "Cacao seco premium", recibidoKg: 150, fecha: "2026-10-10T07:45:00.000Z", estado: "LIBERADO", costoTotalCop: 2_508_000, precioVentaKgCop: 25_000 },
    { id: "CAC003", productor: "Productor C", origen: "Algeciras", finca: FINCAS.Algeciras, producto: "Cacao fino de aroma", recibidoKg: 80, fecha: "2026-10-09T09:20:00.000Z", estado: "PENDIENTE", costoTotalCop: 1_360_000, precioVentaKgCop: 24_000 },
  ];
  const transformaciones: Transformacion[] = [
    { id: "TR-0001", loteId: "CAC001", etapa: "Fermentación y secado", entradaKg: 100, salidaKg: 80, responsable: "Operador de beneficio", incidencias: "Lluvias durante el secado solar.", fecha: "2026-10-19T15:00:00.000Z", idem: "seed-1", sync: "sincronizado" },
    { id: "TR-0002", loteId: "CAC002", etapa: "Fermentación", entradaKg: 90, salidaKg: 79, responsable: "Operador de beneficio", incidencias: "", fecha: "2026-10-15T10:30:00.000Z", idem: "seed-2", sync: "sincronizado" },
    { id: "TR-0003", loteId: "CAC002", etapa: "Secado", entradaKg: 60, salidaKg: 53, responsable: "Operador de beneficio", incidencias: "", fecha: "2026-10-16T11:00:00.000Z", idem: "seed-3", sync: "sincronizado" },
  ];
  const auditoria: EventoAuditoria[] = [
    { id: "AU-0001", quien: OPERADOR, cuando: "2026-10-09T09:20:00.000Z", accion: "Lote recibido", entidad: "CAC003", anterior: null, nuevo: "80 kg · Algeciras" },
    { id: "AU-0002", quien: OPERADOR, cuando: "2026-10-10T07:45:00.000Z", accion: "Lote recibido", entidad: "CAC002", anterior: null, nuevo: "150 kg · Campoalegre" },
    { id: "AU-0003", quien: OPERADOR, cuando: "2026-10-12T08:10:00.000Z", accion: "Lote recibido", entidad: "CAC001", anterior: null, nuevo: "100 kg · Rivera" },
    { id: "AU-0004", quien: OPERADOR, cuando: "2026-10-15T10:30:00.000Z", accion: "Transformación registrada", entidad: "CAC002", anterior: null, nuevo: "Fermentación 90 → 79 kg" },
    { id: "AU-0005", quien: OPERADOR, cuando: "2026-10-16T11:00:00.000Z", accion: "Transformación registrada", entidad: "CAC002", anterior: null, nuevo: "Secado 60 → 53 kg" },
    { id: "AU-0006", quien: ADMIN, cuando: "2026-10-18T14:00:00.000Z", accion: "Cambio de estado", entidad: "CAC002", anterior: "PENDIENTE", nuevo: "LIBERADO", motivo: "Calidad verificada en catación." },
    { id: "AU-0007", quien: OPERADOR, cuando: "2026-10-19T15:00:00.000Z", accion: "Transformación registrada", entidad: "CAC001", anterior: null, nuevo: "Fermentación y secado 100 → 80 kg" },
    { id: "AU-0008", quien: SISTEMA, cuando: "2026-10-19T15:00:01.000Z", accion: "Alerta de merma", entidad: "CAC001", anterior: null, nuevo: "Merma 20% > umbral 15%" },
  ];
  return { version: 1, lotes, transformaciones, auditoria };
}

// ── Store externo ──────────────────────────────────────────────────────────
const KEY = "orivia.datos.v1";
const SERVER_SNAPSHOT = seed();
const listeners = new Set<() => void>();
let cache: Datos | null = null;

function load(): Datos {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Datos;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // almacenamiento no disponible o dañado: se usa la semilla
  }
  return seed();
}

export function getSnapshot() {
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

function commit(next: Datos) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sin persistencia: el estado vive en memoria
  }
  listeners.forEach((l) => l());
}

export function useDatos() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

// ── Conectividad (nodo local / sincronización) ─────────────────────────────
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

// ── Utilidades ─────────────────────────────────────────────────────────────
const round1 = (n: number) => Math.round(n * 10) / 10;
const nextId = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(4, "0")}`;

function audit(d: Datos, e: Omit<EventoAuditoria, "id" | "cuando">): EventoAuditoria {
  return { ...e, id: nextId("AU", d.auditoria.length), cuando: new Date().toISOString() };
}

export function inventario(d: Datos, loteId: string) {
  const lote = d.lotes.find((l) => l.id === loteId);
  const trs = d.transformaciones.filter((t) => t.loteId === loteId);
  const recibido = lote?.recibidoKg ?? 0;
  const consumido = trs.reduce((a, t) => a + t.entradaKg, 0);
  const producido = trs.reduce((a, t) => a + t.salidaKg, 0);
  // En una cadena agroindustrial (RF02/RF08):
  // La materia disponible para procesar es lo recibido menos lo consumido inicialmente,
  // más el producto vendible / disponible resultante de las transformaciones previas.
  // Si la última transformación ya produjo cacao final vendible o etapa intermedia,
  // el stock disponible neto refleja: recibido - consumido + producido (balance de masa).
  // Para consumo de primera etapa o etapas subsiguientes:
  const disponible = round1(Math.max(0, recibido - consumido + producido));
  return { recibido, consumido, disponible, producido: round1(producido) };
}

export function merma(t: Pick<Transformacion, "entradaKg" | "salidaKg">) {
  return t.entradaKg > 0 ? round1(((t.entradaKg - t.salidaKg) / t.entradaKg) * 100) : 0;
}

export function mermaLote(d: Datos, loteId: string) {
  const { consumido, producido } = inventario(d, loteId);
  return consumido > 0 ? round1(((consumido - producido) / consumido) * 100) : 0;
}

/** Costo unitario sobre los kg producidos (o recibidos si aún no hay transformación). Evita dividir entre cero. */
export function economia(d: Datos, lote: Lote) {
  const { producido, recibido } = inventario(d, lote.id);
  const kgBase = producido > 0 ? producido : recibido;
  const costoUnitario = kgBase > 0 ? lote.costoTotalCop / kgBase : 0;
  const margen = lote.precioVentaKgCop > 0 ? round1(((lote.precioVentaKgCop - costoUnitario) / lote.precioVentaKgCop) * 100) : 0;
  return { kgBase, costoUnitario, margen, ingreso: kgBase * lote.precioVentaKgCop };
}

export type Alerta = { id: string; loteId: string; tipo: "merma" | "margen" | "incompleto"; severidad: "alta" | "media"; texto: string };

export function alertas(d: Datos): Alerta[] {
  const out: Alerta[] = [];
  for (const t of d.transformaciones) {
    const m = merma(t);
    if (m > MERMA_UMBRAL)
      out.push({
        id: `merma-${t.id}`,
        loteId: t.loteId,
        tipo: "merma",
        severidad: m >= 20 ? "alta" : "media",
        texto: `${t.loteId}: merma de ${m}% en ${t.etapa.toLowerCase()} (${t.entradaKg} → ${t.salidaKg} kg), supera el umbral de ${MERMA_UMBRAL}%.`,
      });
  }
  for (const l of d.lotes) {
    const { margen } = economia(d, l);
    if (margen < 10)
      out.push({ id: `margen-${l.id}`, loteId: l.id, tipo: "margen", severidad: margen < 0 ? "alta" : "media", texto: `${l.id}: margen estimado de ${margen}%, por debajo del 10%.` });
  }
  return out;
}

/** Pasos públicos de la historia de un lote (para la ficha y la evidencia). */
export function historia(d: Datos, loteId: string): EvidenceStep[] {
  const lote = d.lotes.find((l) => l.id === loteId);
  if (!lote) return [];
  const pasos: EvidenceStep[] = [
    { key: "recepcion", etapa: `Cosecha y recepción · ${lote.finca}`, fecha: lote.fecha, kg: lote.recibidoKg, responsable: lote.productor },
  ];
  d.transformaciones
    .filter((t) => t.loteId === loteId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((t) => pasos.push({ key: t.id, etapa: t.etapa, fecha: t.fecha, kg: t.salidaKg, responsable: t.responsable }));
  return pasos;
}

export const fmtFecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date(iso));
export const fmtFechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso));

// ── Acciones con reglas de negocio ─────────────────────────────────────────
export function siguienteIdLote(d: Datos) {
  const max = d.lotes.reduce((m, l) => Math.max(m, Number(l.id.replace(/\D/g, "")) || 0), 0);
  return `CAC${String(max + 1).padStart(3, "0")}`;
}

export function crearLote(
  input: { id: string; productor: string; origen: Origen; recibidoKg: number; fecha: string },
  actor: Actor,
): Resultado {
  const d = getSnapshot();
  const id = input.id.trim().toUpperCase();
  if (!id || !input.productor.trim() || !input.origen || !input.fecha) return { ok: false, error: "Completa todos los campos del lote." };
  if (!/^[A-Z]{2,5}\d{3,}$/.test(id)) return { ok: false, error: "El identificador debe tener el formato CAC004." };
  if (!Number.isFinite(input.recibidoKg) || input.recibidoKg <= 0) return { ok: false, error: "La cantidad recibida debe ser mayor que 0 kg." };
  if (d.lotes.some((l) => l.id === id)) return { ok: false, error: `El lote ${id} ya existe. El identificador es único.` };

  const lote: Lote = {
    id,
    productor: input.productor.trim(),
    origen: input.origen,
    finca: FINCAS[input.origen],
    producto: "Cacao en proceso",
    recibidoKg: round1(input.recibidoKg),
    fecha: new Date(`${input.fecha}T12:00:00`).toISOString(),
    estado: "PENDIENTE",
    costoTotalCop: Math.round(input.recibidoKg * 16_000),
    precioVentaKgCop: 25_000,
  };
  commit({
    ...d,
    lotes: [...d.lotes, lote],
    auditoria: [...d.auditoria, audit(d, { quien: actor.email, accion: "Lote recibido", entidad: id, anterior: null, nuevo: `${lote.recibidoKg} kg · ${lote.origen}` })],
  });
  return { ok: true, mensaje: `Lote ${id} registrado: ${lote.recibidoKg} kg de ${lote.origen}.` };
}

export function registrarTransformacion(
  input: { loteId: string; etapa: string; entradaKg: number; salidaKg: number; responsable: string; incidencias: string; idem: string },
  actor: Actor,
  online: boolean,
): Resultado {
  const d = getSnapshot();
  if (d.transformaciones.some((t) => t.idem === input.idem))
    return { ok: false, error: "Envío duplicado ignorado: esta operación ya fue registrada (idempotencia)." };
  const lote = d.lotes.find((l) => l.id === input.loteId);
  if (!lote) return { ok: false, error: "Selecciona un lote de origen válido." };
  if (lote.estado === "BLOQUEADO") return { ok: false, error: `${lote.id} está bloqueado: no admite transformaciones.` };
  if (!input.etapa || !input.responsable.trim()) return { ok: false, error: "Indica la etapa y el responsable." };
  if (!(input.entradaKg > 0) || !(input.salidaKg > 0)) return { ok: false, error: "Entrada y salida deben ser mayores que 0 kg." };
  const { disponible } = inventario(d, lote.id);
  if (input.entradaKg > disponible)
    return { ok: false, error: `Inventario insuficiente: ${lote.id} tiene ${disponible} kg disponibles y se intentan consumir ${input.entradaKg} kg.` };
  if (input.salidaKg > input.entradaKg && !input.incidencias.trim())
    return { ok: false, error: "Una salida mayor que la entrada requiere justificación en incidencias." };

  const t: Transformacion = {
    id: nextId("TR", d.transformaciones.length),
    loteId: lote.id,
    etapa: input.etapa,
    entradaKg: round1(input.entradaKg),
    salidaKg: round1(input.salidaKg),
    responsable: input.responsable.trim(),
    incidencias: input.incidencias.trim(),
    fecha: new Date().toISOString(),
    idem: input.idem,
    sync: online ? "sincronizado" : "pendiente",
  };
  const eventos = [audit(d, { quien: actor.email, accion: "Transformación registrada", entidad: lote.id, anterior: null, nuevo: `${t.etapa} ${t.entradaKg} → ${t.salidaKg} kg` })];
  const m = merma(t);
  if (m > MERMA_UMBRAL)
    eventos.push({ ...audit({ ...d, auditoria: [...d.auditoria, ...eventos] }, { quien: SISTEMA, accion: "Alerta de merma", entidad: lote.id, anterior: null, nuevo: `Merma ${m}% > umbral ${MERMA_UMBRAL}%` }) });
  commit({ ...d, transformaciones: [...d.transformaciones, t], auditoria: [...d.auditoria, ...eventos] });
  return {
    ok: true,
    mensaje: `${t.etapa} de ${lote.id} registrada (${t.entradaKg} → ${t.salidaKg} kg, merma ${m}%).${online ? "" : " Guardada en el nodo local, pendiente de sincronizar."}`,
  };
}

export function cambiarEstado(loteId: string, estado: Estado, motivo: string, actor: Actor & { role?: string }): Resultado {
  const d = getSnapshot();
  if (actor.role && actor.role !== "administrador") {
    return { ok: false, error: "Acceso denegado: solo el rol Administrador puede liberar o bloquear lotes (RF09)." };
  }
  const lote = d.lotes.find((l) => l.id === loteId);
  if (!lote) return { ok: false, error: "Lote no encontrado." };
  if (lote.estado === estado) return { ok: false, error: `${loteId} ya está ${estado.toLowerCase()}.` };
  if (estado === "BLOQUEADO" && !motivo.trim()) return { ok: false, error: "Indica el motivo del bloqueo." };
  commit({
    ...d,
    lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, estado } : l)),
    auditoria: [...d.auditoria, audit(d, { quien: actor.email, accion: "Cambio de estado", entidad: loteId, anterior: lote.estado, nuevo: estado, motivo: motivo.trim() || undefined })],
  });
  return { ok: true, mensaje: `${loteId}: ${lote.estado} → ${estado}. Registro de auditoría creado.` };
}

export function actualizarEconomia(loteId: string, costoTotalCop: number, precioVentaKgCop: number, actor: Actor): Resultado {
  const d = getSnapshot();
  const lote = d.lotes.find((l) => l.id === loteId);
  if (!lote) return { ok: false, error: "Lote no encontrado." };
  if (!(costoTotalCop >= 0) || !(precioVentaKgCop > 0)) return { ok: false, error: "El costo no puede ser negativo y el precio debe ser mayor que 0." };
  commit({
    ...d,
    lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, costoTotalCop, precioVentaKgCop } : l)),
    auditoria: [
      ...d.auditoria,
      audit(d, {
        quien: actor.email,
        accion: "Supuestos económicos",
        entidad: loteId,
        anterior: `costo ${lote.costoTotalCop} · precio ${lote.precioVentaKgCop}`,
        nuevo: `costo ${costoTotalCop} · precio ${precioVentaKgCop}`,
      }),
    ],
  });
  return { ok: true, mensaje: `Supuestos económicos de ${loteId} actualizados.` };
}

export function sincronizar(actor: Actor): Resultado {
  const d = getSnapshot();
  const pendientes = d.transformaciones.filter((t) => t.sync === "pendiente").length;
  if (!pendientes) return { ok: true, mensaje: "No hay operaciones pendientes: el nodo local está al día." };
  commit({
    ...d,
    transformaciones: d.transformaciones.map((t) => ({ ...t, sync: "sincronizado" as const })),
    auditoria: [...d.auditoria, audit(d, { quien: actor.email, accion: "Sincronización", entidad: "nodo-pi-01", anterior: `${pendientes} pendientes`, nuevo: "0 pendientes" })],
  });
  return { ok: true, mensaje: `${pendientes} operación(es) sincronizada(s) con la nube.` };
}

export function restablecerDemo() {
  commit(seed());
}

export function exportarCsv(d: Datos) {
  const head = ["lote", "producto", "productor", "origen", "finca", "estado", "recibido_kg", "consumido_kg", "disponible_kg", "producido_kg", "merma_pct", "costo_total_cop", "costo_unitario_cop_kg", "precio_venta_cop_kg", "margen_pct"];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = d.lotes.map((l) => {
    const inv = inventario(d, l.id);
    const eco = economia(d, l);
    return [l.id, l.producto, l.productor, l.origen, l.finca, l.estado, inv.recibido, inv.consumido, inv.disponible, inv.producido, mermaLote(d, l.id), l.costoTotalCop, Math.round(eco.costoUnitario), l.precioVentaKgCop, eco.margen];
  });
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
