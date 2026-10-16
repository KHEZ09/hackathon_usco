/**
 * Pruebas del puente API → paneles y de los mensajes de error en español.
 * Se ejecutan con: npm test
 */

import assert from "node:assert/strict";
import { datosDesdeApi } from "./backend-sync";
import { mensajeError } from "./errores-api";
import { OriviaApiError, type ApiLot } from "./orivia-api";
import { economia, inventario, merma } from "./store";

console.log("Pruebas del puente con el servidor…");

const lote: ApiLot = {
  id: "CAC001",
  product: "Cacao de montaña",
  origin: "Rivera, Huila",
  producer: "Productor A",
  received_kg: 100,
  available_kg: 0,
  status: "BLOCKED",
  received_at: "2026-10-12",
  created_at: "2026-10-12T08:00:00Z",
  merma_pct: 20,
  transformations: [],
  timeline: [
    { id: "e1", type: "LOT_REGISTERED", actor_id: "system-seed", from: null, to: "PENDING", occurred_at: "2026-10-12T08:00:00Z", payload: { received_kg: 100 } },
    {
      id: "e2",
      type: "LOT_TRANSFORMED",
      actor_id: "op-1",
      from: "PENDING",
      to: "PENDING",
      occurred_at: "2026-10-13T08:00:00Z",
      payload: { operation_code: "OP-1", stage: "Fermentación y secado", responsible: "Operador", input_kg: 100, output_kg: 80, merma_pct: 20, alert: { message: "x" }, incident: "" },
    },
    { id: "e3", type: "LOT_STATUS_CHANGED", actor_id: "admin-1", from: "PENDING", to: "BLOCKED", occurred_at: "2026-10-14T08:00:00Z", payload: { reason: "Reclamo del comprador" } },
  ],
  audits: [{ id: "a1", actor_id: "admin-1", action: "LOT_ECONOMICS_UPDATED", changes: { previous: null, new: { total_cost_cop: 1_600_000, sale_price_cop_kg: 25_000 } } }],
  alerts: [],
  economics: {
    sellable_kg: 80,
    total_cost_cop: 1_600_000,
    sale_price_cop_kg: 25_000,
    included_costs: "Mano de obra",
    unit_cost_cop_kg: 20_000,
    margin_pct: 20,
    notes: [],
    formulas: {},
    updated_by: "admin-1",
    updated_at: "2026-10-14T09:00:00Z",
  },
};

const d = datosDesdeApi([lote]);

// El lote del servidor se ve igual en los paneles: estado, origen, transformación y costos.
assert.equal(d.lotes[0].estado, "BLOQUEADO");
assert.equal(d.lotes[0].origen, "Rivera");
assert.equal(d.lotes[0].costosIncluidos, "Mano de obra");
assert.equal(d.transformaciones.length, 1);
assert.equal(d.transformaciones[0].idem, "OP-1");
assert.equal(merma(d.transformaciones[0]), 20);
assert.equal(inventario(d, "CAC001").disponible, 80);
const eco = economia(d, d.lotes[0]);
assert.equal(eco.costoUnitario, 20_000);
assert.equal(eco.margen, 20);

// La auditoría conserva quién, qué y el valor anterior/nuevo, en orden cronológico.
const acciones = d.auditoria.map((a) => a.accion);
assert.deepEqual(acciones, ["Lote recibido", "Transformación registrada", "Alerta de merma", "Cambio de estado", "Supuestos económicos"]);
const cambio = d.auditoria.find((a) => a.accion === "Cambio de estado")!;
assert.equal(cambio.anterior, "PENDIENTE");
assert.equal(cambio.nuevo, "BLOQUEADO");
assert.equal(cambio.motivo, "Reclamo del comprador");
assert.equal(d.auditoria[0].quien, "sistema");

// Errores del backend en español (pruebas del jurado).
const err = (message: string, status = 409, code?: string) => mensajeError(new OriviaApiError(message, status, code));
assert.match(err("received_kg must be finite and greater than zero"), /mayor que 0 kg/);
assert.match(err("input_kg exceeds the available inventory"), /Inventario insuficiente/);
assert.match(err("lot_id already exists"), /ya existe/);
assert.match(err("blocked lots cannot be transformed"), /bloqueado/);
assert.match(err("cannot change BLOCKED to PENDING"), /bloqueado a pendiente/);
assert.match(err("El usuario no tiene permisos suficientes.", 403, "FORBIDDEN"), /permiso/);
assert.equal(err("Mensaje ya en español."), "Mensaje ya en español.");

console.log("✓ Puente con el servidor: lotes, inventario, costos, auditoría y errores en español.");
