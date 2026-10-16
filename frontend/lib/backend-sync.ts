"use client";

// Puente entre la API de ORIVIA y el estado de los paneles: cuando hay sesión real, los
// lotes, transformaciones, estados, auditoría y costos vienen de PostgreSQL (GET /lots)
// y reemplazan los datos locales de demostración.

import { useCallback, useEffect, useState } from "react";
import { hasApiSession, listLots, type ApiLot } from "./orivia-api";
import { FINCAS, MERMA_UMBRAL, reemplazarDatos, type Datos, type Estado, type EventoAuditoria, type Lote, type Transformacion } from "./store";

const ESTADOS: Record<ApiLot["status"], Estado> = { PENDING: "PENDIENTE", LIBERATED: "LIBERADO", BLOCKED: "BLOQUEADO" };

const quien = (actor: string) => (actor === "system-seed" ? "sistema" : actor);
const fechaIso = (valor: string) => {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export function datosDesdeApi(lots: ApiLot[]): Datos {
  const lotes: Lote[] = [];
  const transformaciones: Transformacion[] = [];
  const auditoria: EventoAuditoria[] = [];

  for (const lot of lots) {
    const origen = lot.origin.split(",")[0].trim() || lot.origin;
    lotes.push({
      id: lot.id,
      productor: lot.producer,
      origen,
      finca: FINCAS[origen] ?? lot.producer,
      producto: lot.product,
      recibidoKg: lot.received_kg,
      fecha: fechaIso(lot.received_at || lot.created_at),
      estado: ESTADOS[lot.status],
      costoTotalCop: lot.economics?.total_cost_cop ?? 0,
      precioVentaKgCop: lot.economics?.sale_price_cop_kg ?? 0,
      costosIncluidos: lot.economics?.included_costs || undefined,
    });

    for (const ev of lot.timeline ?? []) {
      const p = ev.payload ?? {};
      const base = { id: `${lot.id}-${ev.id}`, quien: quien(ev.actor_id), cuando: ev.occurred_at, entidad: lot.id };
      if (ev.type === "LOT_REGISTERED") {
        auditoria.push({ ...base, accion: "Lote recibido", anterior: null, nuevo: `${num(p.received_kg)} kg · ${lot.origin}` });
      } else if (ev.type === "LOT_TRANSFORMED") {
        const entrada = num(p.input_kg);
        const salida = num(p.output_kg);
        transformaciones.push({
          id: String(p.operation_code ?? ev.id),
          loteId: lot.id,
          etapa: String(p.stage ?? "Transformación"),
          entradaKg: entrada,
          salidaKg: salida,
          responsable: String(p.responsible ?? ""),
          incidencias: String(p.incident ?? ""),
          fecha: ev.occurred_at,
          idem: String(p.operation_code ?? ev.id),
          sync: "sincronizado",
        });
        auditoria.push({ ...base, accion: "Transformación registrada", anterior: null, nuevo: `${p.stage} ${entrada} → ${salida} kg` });
        if (p.alert) {
          auditoria.push({
            ...base,
            id: `${base.id}-alerta`,
            quien: "sistema",
            accion: "Alerta de merma",
            anterior: null,
            nuevo: `Merma ${Math.round(num(p.merma_pct) * 10) / 10}% > umbral ${MERMA_UMBRAL}%`,
          });
        }
      } else if (ev.type === "LOT_STATUS_CHANGED") {
        auditoria.push({
          ...base,
          accion: "Cambio de estado",
          anterior: ev.from ? ESTADOS[ev.from as ApiLot["status"]] ?? ev.from : null,
          nuevo: ESTADOS[ev.to as ApiLot["status"]] ?? ev.to,
          motivo: typeof p.reason === "string" ? p.reason : undefined,
        });
      }
    }

    const cambiosCosto = (lot.audits ?? []).filter((a) => a.action === "LOT_ECONOMICS_UPDATED");
    cambiosCosto.forEach((a, i) => {
      const previo = a.changes.previous as { total_cost_cop?: number; sale_price_cop_kg?: number } | null;
      const nuevo = a.changes.new as { total_cost_cop?: number; sale_price_cop_kg?: number } | null;
      auditoria.push({
        id: `${lot.id}-${a.id}`,
        quien: quien(a.actor_id),
        // La API guarda la hora del último cambio de costos; los anteriores se ubican en la creación del lote.
        cuando: i === cambiosCosto.length - 1 && lot.economics?.updated_at ? fechaIso(lot.economics.updated_at) : lot.created_at,
        accion: "Supuestos económicos",
        entidad: lot.id,
        anterior: previo ? `costo ${previo.total_cost_cop} · precio ${previo.sale_price_cop_kg}` : null,
        nuevo: nuevo ? `costo ${nuevo.total_cost_cop} · precio ${nuevo.sale_price_cop_kg}` : null,
      });
    });
  }

  auditoria.sort((a, b) => a.cuando.localeCompare(b.cuando));
  return { version: 1, lotes, transformaciones, auditoria };
}

/** Trae los lotes del servidor y reemplaza el estado local. Devuelve false si no hay sesión real. */
export async function sincronizarConBackend() {
  if (!hasApiSession()) return false;
  const lots = await listLots();
  reemplazarDatos(datosDesdeApi(lots));
  return true;
}

export type EstadoSincronizacion = "local" | "cargando" | "servidor" | "error";

/** Sincroniza al montar el panel y expone `recargar` para después de cada escritura en la API. */
export function useSincronizacionBackend() {
  const [estado, setEstado] = useState<EstadoSincronizacion>("local");

  const recargar = useCallback(async () => {
    if (!hasApiSession()) {
      setEstado("local");
      return false;
    }
    setEstado("cargando");
    try {
      await sincronizarConBackend();
      setEstado("servidor");
      return true;
    } catch {
      setEstado("error");
      return false;
    }
  }, []);

  useEffect(() => {
    // Primera carga al abrir el panel (la API responde de forma asíncrona).
    const t = setTimeout(() => void recargar(), 0);
    return () => clearTimeout(t);
  }, [recargar]);

  return { estado, recargar };
}
