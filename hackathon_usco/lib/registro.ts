// Validación del registro de cuentas. Replica las reglas del backend
// (backend/app/users/self_registration.py) para avisar antes de enviar; el servidor
// sigue siendo la autoridad final.

export type RegistroDatos = {
  nombre: string;
  correo: string;
  password: string;
  confirmacion: string;
  rol: string;
};

export type RegistroCampo = keyof RegistroDatos;
export type RegistroErrores = Partial<Record<RegistroCampo, string>>;

export const PASSWORD_MIN = 10;
const PASSWORD_MAX_BYTES = 72;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const NOMBRE_RE = /^\p{L}+(?:[ '.-]\p{L}+)*$/u;

/** Quita caracteres de control y espacios repetidos. */
export function limpiarTexto(valor: string) {
  return valor.normalize("NFC").replace(/\p{C}/gu, "").replace(/\s+/g, " ").trim();
}

/** Requisitos de contraseña que aún no se cumplen (vacío = contraseña segura). */
export function requisitosPendientes(password: string, correo = ""): string[] {
  const faltan: string[] = [];
  if (password.length < PASSWORD_MIN) faltan.push(`al menos ${PASSWORD_MIN} caracteres`);
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) faltan.push(`máximo ${PASSWORD_MAX_BYTES} bytes`);
  if (!/[a-záéíóúñ]/.test(password)) faltan.push("una minúscula");
  if (!/[A-ZÁÉÍÓÚÑ]/.test(password)) faltan.push("una mayúscula");
  if (!/\d/.test(password)) faltan.push("un número");
  if (!/[^\w\s]|_/.test(password)) faltan.push("un símbolo");
  const local = correo.split("@")[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local)) faltan.push("no contener tu correo");
  return faltan;
}

/** Nivel 0→4 para la barra de fortaleza. */
export function fortaleza(password: string) {
  if (!password) return 0;
  const faltan = requisitosPendientes(password).length;
  return Math.max(1, 4 - Math.ceil(faltan / 1.5));
}

export function validarRegistro(d: RegistroDatos, rolesPermitidos: string[]): RegistroErrores {
  const e: RegistroErrores = {};
  const nombre = limpiarTexto(d.nombre);
  const correo = limpiarTexto(d.correo).toLowerCase();
  if (nombre.length < 2 || nombre.length > 120 || !NOMBRE_RE.test(nombre)) e.nombre = "Escribe tu nombre (solo letras, 2 a 120).";
  if (!correo || correo.length > 254 || !EMAIL_RE.test(correo)) e.correo = "Escribe un correo válido.";
  const faltan = requisitosPendientes(d.password, correo);
  if (!d.password) e.password = "Crea una contraseña.";
  else if (faltan.length) e.password = `Debe tener ${faltan.join(", ")}.`;
  if (!d.confirmacion) e.confirmacion = "Confirma la contraseña.";
  else if (d.confirmacion !== d.password) e.confirmacion = "Las contraseñas no coinciden.";
  if (!rolesPermitidos.includes(d.rol)) e.rol = "Elige un rol disponible.";
  return e;
}
