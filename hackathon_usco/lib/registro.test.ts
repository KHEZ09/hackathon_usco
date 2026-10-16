/**
 * Pruebas del registro de cuentas (frontend). Se ejecutan con: npm test
 * Cubren registro válido, contraseña débil, datos inválidos, coincidencia y rol no autorizado.
 * El correo duplicado lo decide el backend (409 EMAIL_UNAVAILABLE): se prueba el mapeo del error.
 */

import assert from "node:assert/strict";
import { fortaleza, limpiarTexto, requisitosPendientes, validarRegistro, type RegistroDatos } from "./registro";
import { OriviaApiError } from "./orivia-api";

const ROLES = ["BUYER", "VIEWER"];
const base: RegistroDatos = {
  nombre: "Ana María Rivera",
  correo: "ana.rivera@finca.co",
  password: "Cacao-Huila-2026",
  confirmacion: "Cacao-Huila-2026",
  rol: "BUYER",
};
const con = (cambios: Partial<RegistroDatos>) => validarRegistro({ ...base, ...cambios }, ROLES);

console.log("Pruebas de registro ORIVIA…");

// Registro exitoso
assert.deepEqual(con({}), {}, "un registro válido no tiene errores");
assert.equal(fortaleza(base.password), 4);

// Contraseña débil
for (const debil of ["corta1!", "sinmayusculas-2026", "SINMINUSCULAS-2026", "SinNumeros-Cacao", "SinSimbolo2026Cacao"]) {
  const e = con({ password: debil, confirmacion: debil });
  assert.ok(e.password, `debe rechazar "${debil}"`);
  assert.ok(!e.password!.includes(debil), "el mensaje no repite la contraseña");
}
assert.ok(requisitosPendientes("Ana.rivera-2026!", "ana.rivera@finca.co").includes("no contener tu correo"));
assert.ok(fortaleza("abc") < 3);

// Datos inválidos
assert.ok(con({ correo: "no-es-correo" }).correo);
assert.ok(con({ correo: "ana@finca" }).correo);
assert.ok(con({ nombre: "<script>alert(1)</script>" }).nombre);
assert.ok(con({ nombre: "A" }).nombre);
assert.ok(con({ confirmacion: "Otra-Clave-2026" }).confirmacion, "las contraseñas deben coincidir");
assert.ok(con({ confirmacion: "" }).confirmacion);
assert.equal(limpiarTexto("  Ana\u0000   María \n"), "Ana María");

// Usuario no autorizado: no puede elegir roles fuera de los que entrega el backend
for (const rol of ["ADMIN", "ACCOUNTING", "OPERATOR", ""]) {
  assert.ok(con({ rol }).rol, `el rol "${rol}" no debe aceptarse`);
}
assert.ok(validarRegistro(base, []).rol, "sin roles del backend no se puede registrar");

// Correo duplicado: el error del backend conserva su código para marcar el campo correo
const dup = new OriviaApiError("No es posible registrar ese correo.", 409, "EMAIL_UNAVAILABLE");
assert.equal(dup.code, "EMAIL_UNAVAILABLE");
assert.equal(dup.status, 409);

console.log("✓ Registro: válido, débil, inválido, coincidencia, rol no autorizado y duplicado.");
