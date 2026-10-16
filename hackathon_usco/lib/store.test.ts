/**
 * Pruebas operativas automatizadas (RF01 - RF12 / Casos OP-01 a OP-19)
 * Definidas en OPERACION_PRUEBA_FUEGO_ORIVIA.md
 * 
 * Se ejecutan con: node --import tsx lib/store.test.ts o npm test
 */

import assert from "node:assert/strict";
import {
  mermaLote,
  economia,
  alertas,
  crearLote,
  registrarTransformacion,
  cambiarEstado,
  exportarCsv,
  restablecerDemo,
  getSnapshot,
  siguienteIdLote,
  type Lote,
} from "./store";

function runTests() {
  console.log("Iniciando suite de pruebas operativas ORIVIA (Prueba de Fuego)...\n");
  restablecerDemo();
  const d0 = getSnapshot();

  // Test 1: OP-01, OP-02, OP-03, OP-04 (RF01 - Recepción y validaciones)
  console.log("1. Validando RF01: Recepción de lotes y validaciones de entrada...");
  const actorOp = { email: "operador@orivia.co", role: "operador" };
  const actorAdmin = { email: "admin@orivia.co", role: "administrador" };

  // Cantidad negativa o cero
  const resNeg = crearLote({ id: "CAC099", productor: "Productor Test", origen: "Rivera", recibidoKg: -5, fecha: "2026-10-16" }, actorOp);
  assert.strictEqual(resNeg.ok, false, "Debe rechazar kg negativos");

  const resCero = crearLote({ id: "CAC099", productor: "Productor Test", origen: "Rivera", recibidoKg: 0, fecha: "2026-10-16" }, actorOp);
  assert.strictEqual(resCero.ok, false, "Debe rechazar 0 kg");

  // Campo obligatorio vacío
  const resVacio = crearLote({ id: "", productor: "Productor Test", origen: "Rivera", recibidoKg: 100, fecha: "2026-10-16" }, actorOp);
  assert.strictEqual(resVacio.ok, false, "Debe rechazar ID vacío");

  // ID duplicado
  const resDup = crearLote({ id: "CAC001", productor: "Productor Duplicado", origen: "Rivera", recibidoKg: 100, fecha: "2026-10-16" }, actorOp);
  assert.strictEqual(resDup.ok, false, "Debe rechazar ID duplicado (CAC001 ya existe)");

  // Lote válido
  const nuevoId = siguienteIdLote(d0);
  const resValido = crearLote({ id: nuevoId, productor: "Finca La Paz", origen: "Campoalegre", recibidoKg: 120, fecha: "2026-10-16" }, actorOp);
  assert.strictEqual(resValido.ok, true, "Debe crear lote válido");
  console.log("   ✓ Rechazo de datos inválidos y creación única comprobados.");

  // Test 2: OP-05, OP-06, OP-07 (RF02 & RF08 - Transformación, inventario e idempotencia)
  console.log("2. Validando RF02 & RF08: Transformación, saldo e idempotencia...");
  const loteTestId = nuevoId;
  const idemKey = "test-idem-key-001";

  // Consumo mayor a lo disponible
  const resExceso = registrarTransformacion(
    { loteId: loteTestId, etapa: "Fermentación", entradaKg: 200, salidaKg: 160, responsable: "Operador A", incidencias: "", idem: idemKey },
    actorOp,
    true
  );
  assert.strictEqual(resExceso.ok, false, "Debe rechazar consumo que supere el saldo disponible");

  // Transformación válida
  const resTransOk = registrarTransformacion(
    { loteId: loteTestId, etapa: "Fermentación", entradaKg: 100, salidaKg: 80, responsable: "Operador A", incidencias: "", idem: idemKey },
    actorOp,
    true
  );
  assert.strictEqual(resTransOk.ok, true, "Debe procesar transformación válida");

  // Reenvío idempotente
  const resReenvio = registrarTransformacion(
    { loteId: loteTestId, etapa: "Fermentación", entradaKg: 100, salidaKg: 80, responsable: "Operador A", incidencias: "", idem: idemKey },
    actorOp,
    true
  );
  assert.strictEqual(resReenvio.ok, false, "Debe rechazar reenvío con la misma clave de idempotencia");
  console.log("   ✓ Consumo excesivo rechazado e idempotencia verificada.");

  // Test 3: OP-08, OP-09, OP-10 (RF04, RF05, RF12 - Merma, alerta y economía del caso oficial)
  console.log("3. Validando RF04, RF05 & RF12: Cálculos de merma y balance económico...");
  // Escenario oficial CAC001: 100 kg -> 80 kg, merma = 20%, costo total = $1.600.000, precio = $25.000
  const dActual = getSnapshot();
  const cac001 = dActual.lotes.find((l) => l.id === "CAC001")!;
  const eco001 = economia(dActual, cac001);
  const merma001 = mermaLote(dActual, "CAC001");

  assert.strictEqual(merma001, 20, "Merma de CAC001 debe ser exactamente 20%");
  assert.strictEqual(eco001.costoUnitario, 20_000, "Costo unitario de CAC001 debe ser $20.000 COP/kg");
  assert.strictEqual(eco001.margen, 20, "Margen sobre venta de CAC001 debe ser 20%");

  // Alerta generada
  const listaAlertas = alertas(dActual);
  const alertaMerma001 = listaAlertas.find((a) => a.loteId === "CAC001" && a.tipo === "merma");
  assert.ok(alertaMerma001, "Debe existir alerta de merma para CAC001 por superar umbral del 15%");

  // Manejo de división entre cero en economía
  const loteVacio: Lote = {
    id: "CAC999",
    productor: "Test",
    origen: "Rivera",
    finca: "Test",
    producto: "Test",
    recibidoKg: 0,
    fecha: "2026-10-16",
    estado: "PENDIENTE",
    costoTotalCop: 1_000_000,
    precioVentaKgCop: 0,
  };
  const ecoCero = economia(dActual, loteVacio);
  assert.strictEqual(Number.isFinite(ecoCero.costoUnitario), true, "Costo no debe ser NaN o Infinity");
  assert.strictEqual(Number.isFinite(ecoCero.margen), true, "Margen no debe ser NaN o Infinity");
  console.log("   ✓ Merma del 20%, costo $20.000 COP y margen 20% conformes sin división por cero.");

  // Test 4: OP-13, OP-14 (RF09 & RF10 - Permisos de estado y motivo de bloqueo)
  console.log("4. Validando RF09 & RF10: Permisos de estado por rol y auditoría inmutable...");
  // Operador intenta bloquear o liberar
  const resOpBloqueo = cambiarEstado("CAC001", "BLOQUEADO", "Motivo de prueba", actorOp);
  assert.strictEqual(resOpBloqueo.ok, false, "El operador NO debe tener permiso para bloquear lotes");

  // Administrador bloquea sin motivo
  const resAdminSinMotivo = cambiarEstado("CAC001", "BLOQUEADO", "   ", actorAdmin);
  assert.strictEqual(resAdminSinMotivo.ok, false, "El bloqueo requiere motivo obligatorio");

  // Administrador bloquea con motivo
  const resAdminBloqueoOk = cambiarEstado("CAC001", "BLOQUEADO", "Incidencia hora 12: merma superior al umbral", actorAdmin);
  assert.strictEqual(resAdminBloqueoOk.ok, true, "Administrador debe poder bloquear con motivo");

  const dPostBloqueo = getSnapshot();
  const cac001Bloqueado = dPostBloqueo.lotes.find((l) => l.id === "CAC001")!;
  assert.strictEqual(cac001Bloqueado.estado, "BLOQUEADO");

  // Auditoría registra el cambio con motivo
  const ultimoEvento = dPostBloqueo.auditoria[dPostBloqueo.auditoria.length - 1];
  assert.strictEqual(ultimoEvento.entidad, "CAC001");
  assert.strictEqual(ultimoEvento.accion, "Cambio de estado");
  assert.strictEqual(ultimoEvento.nuevo, "BLOQUEADO");
  assert.ok(ultimoEvento.motivo && ultimoEvento.motivo.includes("Incidencia hora 12"));
  console.log("   ✓ Permiso restringido a admin y auditoría con motivo verificado.");

  // Test 5: OP-16 (RF11 - Exportación CSV para administración)
  console.log("5. Validando RF11: Exportación CSV y columnas requeridas...");
  const csv = exportarCsv(dPostBloqueo);
  assert.ok(csv.includes("CAC001"), "El CSV debe contener CAC001");
  assert.ok(csv.includes("BLOQUEADO"), "El CSV debe reflejar el estado actual");
  assert.ok(csv.includes("costo_unitario_cop_kg"), "El CSV debe contener columnas requeridas");
  console.log("   ✓ Exportación CSV con columnas de auditoría y balance completa.");

  console.log("\n========================================================");
  console.log("✅ TODAS LAS PRUEBAS AUTOMATIZADAS PASARON EXITOSAMENTE");
  console.log("========================================================\n");
}

runTests();
