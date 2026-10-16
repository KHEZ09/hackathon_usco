// Traduce al español los mensajes técnicos que devuelve el backend de lotes, para que el
// operador y el administrador vean errores claros (pruebas del jurado: dato inválido,
// lote duplicado, falta de existencia, bloqueo).

import { OriviaApiError } from "./orivia-api";

const CAMPOS: Record<string, string> = {
  lot_id: "el identificador del lote",
  product: "el producto",
  origin: "el origen",
  producer: "el productor",
  received_kg: "la cantidad recibida",
  received_at: "la fecha de recepción",
  operation_code: "el código de la operación",
  stage: "la etapa",
  responsible: "el responsable",
  input_kg: "la entrada",
  output_kg: "la salida",
  incident: "la incidencia",
};

const ESTADOS: Record<string, string> = { PENDING: "pendiente", LIBERATED: "liberado", BLOCKED: "bloqueado" };
const campo = (c: string) => CAMPOS[c] ?? c;

const REGLAS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^lot_id already exists$/i, () => "Ese identificador de lote ya existe. Cada lote debe tener un identificador único."],
  [/^lot_id is too long$/i, () => "El identificador del lote es demasiado largo (máximo 80 caracteres)."],
  [/^lot_id, product, origin and producer are required$/i, () => "Completa el identificador, el producto, el origen y el productor."],
  [/^received_kg must be numeric$/i, () => "La cantidad recibida debe ser un número."],
  [/^received_kg must be finite and greater than zero$/i, () => "La cantidad recibida debe ser mayor que 0 kg. No se guardó el lote."],
  [/^input_kg exceeds the available inventory$/i, () => "Inventario insuficiente: la entrada supera los kg disponibles del lote. No se registró la operación."],
  [/^input_kg must be finite and greater than zero$/i, () => "La entrada debe ser mayor que 0 kg."],
  [/^input_kg and output_kg must be numeric$/i, () => "La entrada y la salida deben ser números."],
  [/^output_kg must be finite, non-negative and no greater than input_kg$/i, () => "La salida no puede ser negativa ni mayor que la entrada."],
  [/^blocked lots cannot be transformed$/i, () => "El lote está bloqueado: no admite transformaciones hasta que un administrador lo libere."],
  [/^operation_code already belongs to another lot$/i, () => "Ese código de operación ya se usó en otro lote."],
  [/^operation_code, stage and responsible are required$/i, () => "Indica la etapa y el responsable de la transformación."],
  [/^reason is required for every status change$/i, () => "Indica el motivo del cambio de estado."],
  [/^status must be PENDING, LIBERATED or BLOCKED$/i, () => "El estado debe ser pendiente, liberado o bloqueado."],
  [/^cannot change (\w+) to (\w+)$/i, (m) => `No se puede pasar de ${ESTADOS[m[1]] ?? m[1]} a ${ESTADOS[m[2]] ?? m[2]}.`],
  [/^(\w+) is required$/i, (m) => `Falta ${campo(m[1])}.`],
  [/^(\w+) must be numeric$/i, (m) => `${campo(m[1])[0].toUpperCase()}${campo(m[1]).slice(1)} debe ser un número.`],
  [/^(\w+) must be finite and (greater than zero|non-negative)$/i, (m) =>
    `${campo(m[1])[0].toUpperCase()}${campo(m[1]).slice(1)} debe ser ${m[2].startsWith("greater") ? "mayor que 0" : "mayor o igual a 0"}.`],
];

const CODIGOS: Record<string, string> = {
  LOT_NOT_FOUND: "No se encontró el lote.",
  FORBIDDEN: "Tu rol no tiene permiso para esta acción. El servidor la rechazó.",
  AUTHENTICATION_REQUIRED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  BLOCKCHAIN_UNAVAILABLE: "El registro de evidencia no está disponible en este momento. Intenta de nuevo.",
  NETWORK_ERROR: "No se pudo conectar con el servidor de ORIVIA.",
};

/** Mensaje en español para cualquier error devuelto por la API. */
export function mensajeError(error: unknown, respaldo = "No se pudo completar la operación.") {
  if (error instanceof OriviaApiError) {
    const texto = error.message.trim();
    for (const [patron, traducir] of REGLAS) {
      const m = texto.match(patron);
      if (m) return traducir(m);
    }
    if (error.code && CODIGOS[error.code] && (!texto || texto === error.code)) return CODIGOS[error.code];
    if (error.code === "FORBIDDEN" || error.status === 403) return CODIGOS.FORBIDDEN;
    return texto || respaldo;
  }
  return error instanceof Error && error.message ? error.message : respaldo;
}
