/**
 * Pruebas de la red del clúster (REQUERIMIENTOS_LANDING_CLUSTER_ORIVIA.md, LND-02..LND-09)
 * aplicadas a los paneles de operador y administrador.
 *
 * Se ejecutan con: npm test
 */

import assert from "node:assert/strict";
import {
  ASOCIACION_ID,
  calcularConfianza,
  cambiarEstadoActor,
  coincidencias,
  contactoVisible,
  getCluster,
  ofertasDeLotes,
  publicarNecesidad,
  registrarSenal,
  responderConexion,
  restablecerCluster,
  simularRespuestaContraparte,
  solicitarConexion,
} from "./cluster";
import { cambiarEstado, getSnapshot, restablecerDemo } from "./store";

const OPERADOR = { email: "operador@orivia.co", role: "operador" };
const ADMIN = { email: "admin@orivia.co", role: "administrador" };

function caso(nombre: string, fn: () => void) {
  fn();
  console.log(`   ✓ ${nombre}`);
}

console.log("Pruebas de la red del clúster ORIVIA...\n");
restablecerDemo();
restablecerCluster();

caso("trust-v1 reproduce el cálculo del backend (Finca El Porvenir = 95, ALTA)", () => {
  const r = calcularConfianza({ perfilCompleto: true, evidencias: 5, eventosVerificados: 5, controlesConsistencia: 5, incidenciasResueltas: 2 , incidenciasAbiertas: 0 });
  assert.equal(r.score, 95);
  assert.equal(r.nivel, "ALTA");
  const conIncidencia = calcularConfianza({ perfilCompleto: true, evidencias: 2, eventosVerificados: 3, controlesConsistencia: 2, incidenciasResueltas: 0, incidenciasAbiertas: 1 });
  assert.equal(conIncidencia.score, 20 + 8 + 12 + 10 - 10);
  assert.equal(conIncidencia.nivel, "BAJA");
});

caso("Solo lotes LIBERADO aparecen como oferta; CAC001 y CAC003 no se ofrecen", () => {
  const ids = ofertasDeLotes(getSnapshot()).map((o) => o.loteId);
  assert.deepEqual(ids, ["CAC002"]);
});

caso("Un lote bloqueado deja de ofertarse", () => {
  cambiarEstado("CAC002", "BLOQUEADO", "Prueba de bloqueo", { email: ADMIN.email, role: "administrador" } as never);
  assert.equal(ofertasDeLotes(getSnapshot()).length, 0);
  restablecerDemo();
});

caso("El operador publica una necesidad válida y se rechaza cantidad 0", () => {
  const malo = publicarNecesidad({ titulo: "Sacos", descripcion: "Sacos de fique", categoria: "INPUTS", cantidad: 0, unidad: "unidades", visibilidad: "PUBLIC" }, OPERADOR);
  assert.equal(malo.ok, false);
  const bueno = publicarNecesidad({ titulo: "Sacos de fique", descripcion: "Para empaque de lotes", categoria: "INPUTS", cantidad: 200, unidad: "unidades", visibilidad: "PUBLIC" }, OPERADOR);
  assert.equal(bueno.ok, true);
  assert.equal(getCluster().necesidades.at(-1)?.actorId, ASOCIACION_ID);
});

caso("El operador no puede solicitar conexiones (permiso connections:create)", () => {
  const r = solicitarConexion({ destinoId: "actor-buy-001", mensaje: "Hola" }, OPERADOR);
  assert.equal(r.ok, false);
});

caso("Solicitar conexión crea REQUESTED, no ACCEPTED, y rechaza duplicados", () => {
  const r = solicitarConexion({ destinoId: "actor-trans-001", necesidadId: undefined, mensaje: "Conversemos sobre cacao fino" }, ADMIN);
  assert.equal(r.ok, true);
  assert.equal(getCluster().conexiones.at(-1)?.estado, "REQUESTED");
  const dup = solicitarConexion({ destinoId: "actor-trans-001", mensaje: "Otra vez" }, ADMIN);
  assert.equal(dup.ok, false);
});

caso("No se puede conectar con un actor en verificación ni consigo mismo", () => {
  assert.equal(solicitarConexion({ destinoId: "actor-agro-001", mensaje: "Hola" }, ADMIN).ok, false);
  assert.equal(solicitarConexion({ destinoId: ASOCIACION_ID, mensaje: "Hola" }, ADMIN).ok, false);
});

caso("El contacto solo se revela tras aceptar la conexión", () => {
  assert.equal(contactoVisible(getCluster(), "actor-buy-001", "operador"), false);
  assert.equal(responderConexion("con-001", "REJECTED", "", ADMIN).ok, false, "rechazo sin motivo");
  assert.equal(responderConexion("con-001", "ACCEPTED", "", ADMIN).ok, true);
  assert.equal(contactoVisible(getCluster(), "actor-buy-001", "operador"), true);
  assert.equal(responderConexion("con-001", "ACCEPTED", "", ADMIN).ok, false, "no se responde dos veces");
});

caso("Aceptar una conexión ligada a una necesidad la marca con aliado", () => {
  const r = simularRespuestaContraparte("con-004", "ACCEPTED", ADMIN);
  assert.equal(r.ok, true);
  assert.equal(getCluster().necesidades.find((n) => n.id === "need-006")?.estado, "MATCHED");
});

caso("Suspender un actor exige motivo y cancela sus solicitudes pendientes", () => {
  assert.equal(cambiarEstadoActor("actor-trans-001", "SUSPENDED", "", ADMIN).ok, false);
  assert.equal(cambiarEstadoActor("actor-trans-001", "SUSPENDED", "Documentación vencida", ADMIN).ok, true);
  const pendientes = getCluster().conexiones.filter((x) => x.estado === "REQUESTED" && (x.solicitanteId === "actor-trans-001" || x.destinoId === "actor-trans-001"));
  assert.equal(pendientes.length, 0);
});

caso("Las señales son append-only, cambian la confianza y quedan auditadas", () => {
  const antes = getSnapshot().auditoria.length;
  assert.equal(registrarSenal("actor-prod-002", "INCIDENCIA_RESUELTA", "Pesaje confirmado", ADMIN).ok, true);
  assert.equal(registrarSenal("actor-prod-002", "INCIDENCIA_RESUELTA", "Otra", ADMIN).ok, false);
  assert.equal(getCluster().senales.length, 1);
  assert.ok(getSnapshot().auditoria.length > antes);
});

caso("Las coincidencias son sugerencias explicadas y no crean conexiones", () => {
  const conexiones = getCluster().conexiones.length;
  const lista = coincidencias(getCluster(), getSnapshot());
  assert.ok(lista.length > 0);
  assert.ok(lista.every((m) => m.razones.length === 3));
  assert.equal(getCluster().conexiones.length, conexiones);
});

console.log("\n✅ Pruebas de la red del clúster superadas.");
